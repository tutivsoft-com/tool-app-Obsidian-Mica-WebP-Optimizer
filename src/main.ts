import { Menu, Notice, Plugin, TFile, TFolder } from "obsidian";
import { convertToWebp } from "./converter";
import { ConfirmScanModal, FolderPickerModal, LargerFileModal, LogModal, ProgressModal } from "./modals";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { MicaSettingTab } from "./settings-tab";
import type { BatchJournal, BatchJournalEntry, BatchProgress, ConversionLogEntry, MicaSettings } from "./types";
import { baseOutputPath, isAnimatedImage, isSupportedPath, isWatched, isWithinFolder, normalizePath, replaceReferences, scanSummary, stableHash, uniqueOutputPath } from "./utils";

const PLUGIN_NAME = "Mica";
const makeId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default class MicaPlugin extends Plugin {
  declare settings: MicaSettings;
  private queue: TFile[] = [];
  private queued = new Set<string>();
  private processing = false;
  private cancelRequested = false;
  private paused = false;
  private progressModal: ProgressModal | null = null;
  private progress: BatchProgress = { total: 0, completed: 0, converted: 0, skipped: 0, failed: 0, current: "", paused: false, cancelled: false };
  private noteLocks = new Map<string, Promise<void>>();

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    await this.saveSettings();
    this.addRibbonIcon("image", "Mica: optimize images", () => void this.runFolderPicker());
    this.addCommand({ id: "scan-current-folder", name: "Scan current folder and optimize", callback: () => void this.runCurrentFolder() });
    this.addCommand({ id: "scan-complete-vault", name: "Scan complete vault and optimize", callback: () => void this.runScan(null) });
    this.addCommand({ id: "cancel-optimization", name: "Cancel active optimization", callback: () => this.cancel() });
    this.addCommand({ id: "pause-optimization", name: "Pause or resume optimization", callback: () => this.togglePause() });
    this.addCommand({ id: "rollback-last-batch", name: "Rollback most recent optimization batch", callback: () => void this.rollbackLastBatch() });
    this.addCommand({ id: "view-conversion-log", name: "View conversion log", callback: () => this.openLog() });
    this.addSettingTab(new MicaSettingTab(this.app, this));
    this.registerEvent(this.app.vault.on("create", (file) => { if (file instanceof TFile) this.scheduleAutoOptimize(file); }));
    this.registerEvent(this.app.vault.on("modify", (file) => { if (file instanceof TFile) this.scheduleAutoOptimize(file); }));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => { if (file instanceof TFile || file instanceof TFolder) this.addFileMenu(menu, file); }));
    this.registerEvent(this.app.workspace.on("editor-menu", (menu) => this.addEditorMenu(menu)));
  }

  onunload(): void { this.cancelRequested = true; this.progressModal?.close(); }
  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
  openLog(): void { new LogModal(this.app, this.settings.log).open(); }

  private addFileMenu(menu: Menu, file: TFile | TFolder): void {
    if (file instanceof TFile && isSupportedPath(file.path)) menu.addItem((item) => item.setTitle("Mica: Optimize this image").setIcon("image").onClick(() => void this.runScan(file.parent instanceof TFolder ? file.parent : null, file)));
    if (file instanceof TFolder) menu.addItem((item) => item.setTitle("Mica: Review folder optimization").setIcon("image").onClick(() => void this.runScan(file)));
  }

  private addEditorMenu(menu: Menu): void {
    const file = this.app.workspace.getActiveFile();
    if (file && isSupportedPath(file.path)) menu.addItem((item) => item.setTitle("Mica: Optimize images in current folder").onClick(() => void this.runCurrentFolder()));
  }

  private scheduleAutoOptimize(file: TFile): void {
    if (!this.settings.autoOptimize || !isSupportedPath(file.path) || !isWatched(file.path, this.settings) || this.isExcludedPath(file.path)) return;
    window.setTimeout(() => {
      if (!this.queued.has(file.path)) { this.queue.push(file); this.queued.add(file.path); }
      void this.drainQueue();
    }, 500);
  }

  private async runCurrentFolder(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    await this.runScan(file?.parent instanceof TFolder ? file.parent : null);
  }

  private async runFolderPicker(): Promise<void> {
    const folders = this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder);
    new FolderPickerModal(this.app, folders, (folder) => { if (folder !== undefined) void this.runScan(folder); }).open();
  }

  private isExcludedPath(path: string): boolean {
    const normalized = normalizePath(path);
    // Output files are WebP and therefore fail the supported-extension check;
    // do not exclude PNG/JPEG sources merely because the user chose the same
    // folder for output.
    return isWithinFolder(normalized, this.settings.backupFolder);
  }

  private async collectFiles(folder: TFolder | null): Promise<{ files: TFile[]; skippedAnimated: TFile[]; skippedUnsupported: TFile[] }> {
    const files = this.app.vault.getFiles().filter((file) => (!folder || isWithinFolder(file.path, folder.path)) && !this.isExcludedPath(file.path));
    const skippedAnimated: TFile[] = [];
    const skippedUnsupported: TFile[] = [];
    const eligible: TFile[] = [];
    for (const file of files) {
      if (!isSupportedPath(file.path)) { skippedUnsupported.push(file); continue; }
      const bytes = await this.app.vault.readBinary(file);
      if (isAnimatedImage(bytes, file.extension)) skippedAnimated.push(file); else eligible.push(file);
    }
    return { files: eligible, skippedAnimated, skippedUnsupported };
  }

  private async runScan(folder: TFolder | null, singleFile?: TFile): Promise<void> {
    if (this.processing) { new Notice(`${PLUGIN_NAME}: another optimization is already running.`); return; }
    const collected = singleFile
      ? (isAnimatedImage(await this.app.vault.readBinary(singleFile), singleFile.extension) ? { files: [] as TFile[], skippedAnimated: [singleFile], skippedUnsupported: [] as TFile[] } : { files: [singleFile], skippedAnimated: [] as TFile[], skippedUnsupported: [] as TFile[] })
      : await this.collectFiles(folder);
    const selected = collected.files;
    const summary = scanSummary(selected.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size })), { ...this.settings, watchedFolders: folder ? [folder.path] : [] });
    summary.skipped.push(...collected.skippedAnimated.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size, reason: "Animated PNG" })));
    summary.skipped.push(...collected.skippedUnsupported.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size, reason: "Unsupported file type" })));
    if (!summary.candidates.length) { new Notice(`${PLUGIN_NAME}: no eligible PNG or JPEG images were found.`); return; }
    new ConfirmScanModal(this.app, summary, () => void this.optimizeFiles(selected.filter((file) => summary.candidates.some((candidate) => candidate.path === file.path)))).open();
  }

  private updateProgress(patch: Partial<BatchProgress>): void {
    this.progress = { ...this.progress, ...patch, paused: this.paused, cancelled: this.cancelRequested };
    this.progressModal?.update(this.progress);
  }

  private async optimizeFiles(files: TFile[]): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    this.cancelRequested = false;
    this.paused = false;
    this.progress = { total: files.length, completed: 0, converted: 0, skipped: 0, failed: 0, current: "", paused: false, cancelled: false };
    this.progressModal = new ProgressModal(this.app, this.progress, () => this.cancel(), () => this.togglePause());
    this.progressModal.open();
    const journal: BatchJournal = { id: makeId(), startedAt: new Date().toISOString(), entries: [] };
    this.settings.lastBatch = journal;
    await this.saveSettings();
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (!this.cancelRequested) {
        await this.waitIfPaused();
        if (this.cancelRequested) return;
        const index = nextIndex++;
        if (index >= files.length) return;
        const file = files[index];
        this.updateProgress({ current: file.path });
        try {
          const result = await this.optimizeOne(file, journal);
          this.updateProgress({ completed: this.progress.completed + 1, converted: this.progress.converted + (result === "converted" ? 1 : 0), skipped: this.progress.skipped + (result === "skipped" ? 1 : 0) });
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unexpected conversion failure.";
          this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, sourceBytes: file.stat.size, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "failed", reason });
          this.updateProgress({ completed: this.progress.completed + 1, failed: this.progress.failed + 1 });
        }
        await this.saveSettings();
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.settings.concurrency, files.length) }, () => worker()));
    journal.completedAt = new Date().toISOString();
    await this.saveSettings();
    const cancelled = this.cancelRequested;
    this.processing = false;
    this.progressModal?.close();
    this.progressModal = null;
    new Notice(`${PLUGIN_NAME}: ${cancelled ? "cancelled" : "batch complete"} — ${this.progress.converted} converted, ${this.progress.skipped} skipped, ${this.progress.failed} failed.`);
  }

  private async waitIfPaused(): Promise<void> { while (this.paused && !this.cancelRequested) await new Promise<void>((resolve) => window.setTimeout(resolve, 100)); }
  private togglePause(): void { if (!this.processing) return; this.paused = !this.paused; this.updateProgress({}); }
  private cancel(): void { if (!this.processing) { new Notice(`${PLUGIN_NAME}: no optimization is running.`); return; } this.cancelRequested = true; this.updateProgress({}); new Notice(`${PLUGIN_NAME}: cancellation requested; the current verified file will finish safely.`); }

  private async optimizeOne(file: TFile, journal: BatchJournal): Promise<"converted" | "skipped"> {
    const sourceBytes = await this.app.vault.readBinary(file);
    const sourceHash = stableHash(sourceBytes);
    const previous = this.settings.log.find((entry) => entry.source === file.path && entry.result === "converted" && entry.reason?.startsWith(`hash:${sourceHash}:`));
    if (previous?.output && await this.app.vault.adapter.exists(previous.output)) {
      this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: previous.output, sourceBytes: file.stat.size, outputBytes: previous.outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "already-processed", reason: "Verified output already exists." });
      return "skipped";
    }
    const conversion = await convertToWebp(sourceBytes, file.extension, this.settings.quality, this.settings.qualityMode, this.settings.maxDimension, this.settings.metadataPolicy);
    const base = baseOutputPath(file.path, this.settings.outputFolder);
    const outputPath = uniqueOutputPath(base, this.app.vault.getFiles().map((item) => item.path));
    const outputBytes = conversion.bytes.byteLength;
    const outputIsLarger = outputBytes >= sourceBytes.byteLength;
    const candidate = { path: file.path, name: file.name, extension: file.extension, size: sourceBytes.byteLength };
    if (outputIsLarger && this.settings.showLargerFilePrompt) {
      const keepWebp = await this.askKeepLarger(candidate, outputBytes);
      if (!keepWebp) {
        this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "larger-kept-original", reason: "Original retained because WebP was larger." });
        return "skipped";
      }
    }
    await this.ensureFolder(outputPath);
    await this.app.vault.createBinary(outputPath, conversion.bytes);
    const journalEntry: BatchJournalEntry = { sourcePath: file.path, outputPath, sourceHash, sourceBytes: sourceBytes.byteLength, noteChanges: [], originalMoved: false };
    journal.entries.push(journalEntry);
    await this.saveSettings();
    const changedNotes = await this.updateReferences(file.path, outputPath);
    journalEntry.noteChanges = changedNotes;
    if (changedNotes.length === 0 && this.settings.originalHandling === "review") {
      this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: outputPath, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "review", reason: "No safe reference was found; original kept." });
      return "skipped";
    }
    if (this.settings.originalHandling === "backup") {
      const backupPath = uniqueOutputPath(`${this.settings.backupFolder}/${file.path}`, this.app.vault.getFiles().map((item) => item.path));
      await this.ensureFolder(backupPath);
      await this.app.vault.rename(file, backupPath);
      journalEntry.backupPath = backupPath;
      journalEntry.originalMoved = true;
    }
    this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: outputPath, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "converted", reason: `hash:${sourceHash}:${conversion.metadataPreserved ? "metadata-kept" : "metadata-stripped"}${outputIsLarger ? ":larger-accepted" : ""}` });
    return "converted";
  }

  private askKeepLarger(source: { path: string; name: string; extension: string; size: number }, outputBytes: number): Promise<boolean> {
    return new Promise((resolve) => new LargerFileModal(this.app, source, outputBytes, resolve).open());
  }

  private async updateReferences(sourcePath: string, outputPath: string): Promise<Array<{ path: string; originalContent: string }>> {
    const changes: Array<{ path: string; originalContent: string }> = [];
    try {
      for (const note of this.app.vault.getMarkdownFiles()) {
        await this.withNoteLock(note.path, async () => {
          const original = await this.app.vault.read(note);
          const updated = replaceReferences(original, sourcePath, outputPath, note.path);
          if (!updated.changed) return;
          changes.push({ path: note.path, originalContent: original });
          await this.app.vault.modify(note, updated.content);
        });
      }
    } catch (error) {
      for (const change of changes.slice().reverse()) {
        const note = this.app.vault.getAbstractFileByPath(change.path);
        if (note instanceof TFile) await this.app.vault.modify(note, change.originalContent).catch(() => undefined);
      }
      throw error;
    }
    return changes;
  }

  private async withNoteLock(path: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.noteLocks.get(path) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    this.noteLocks.set(path, current);
    try { await current; } finally { if (this.noteLocks.get(path) === current) this.noteLocks.delete(path); }
  }

  private async drainQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    const files = this.queue.splice(0);
    for (const file of files) this.queued.delete(file.path);
    await this.optimizeFiles(files.filter((file) => file.parent && isSupportedPath(file.path)));
  }

  private appendLog(entry: ConversionLogEntry): void { this.settings.log.push(entry); this.settings.log = this.settings.log.slice(-500); }

  private async ensureFolder(path: string): Promise<void> {
    const parts = normalizePath(path).split("/").slice(0, -1);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) await this.app.vault.createFolder(current).catch(() => undefined);
    }
  }

  async rollbackLastBatch(): Promise<void> {
    if (this.processing) { new Notice(`${PLUGIN_NAME}: wait for the active optimization to finish before rolling back.`); return; }
    const journal = this.settings.lastBatch;
    if (!journal?.entries.length) { new Notice(`${PLUGIN_NAME}: there is no recoverable batch.`); return; }
    let restored = 0;
    for (const entry of journal.entries.slice().reverse()) {
      for (const noteChange of entry.noteChanges.slice().reverse()) {
        const note = this.app.vault.getAbstractFileByPath(noteChange.path);
        if (note instanceof TFile) await this.app.vault.modify(note, noteChange.originalContent).catch(() => undefined);
      }
      if (entry.backupPath) {
        const backup = this.app.vault.getAbstractFileByPath(entry.backupPath);
        if (backup instanceof TFile && !(await this.app.vault.adapter.exists(entry.sourcePath))) await this.app.vault.rename(backup, entry.sourcePath).catch(() => undefined);
      }
      if (entry.outputPath && this.app.vault.getAbstractFileByPath(entry.outputPath) instanceof TFile) {
        const references = await this.findReferences(entry.outputPath);
        if (!references) await this.app.vault.delete(this.app.vault.getAbstractFileByPath(entry.outputPath) as TFile).catch(() => undefined);
      }
      restored++;
    }
    this.settings.lastBatch = null;
    await this.saveSettings();
    new Notice(`${PLUGIN_NAME}: rollback restored ${restored} conversion(s).`);
  }

  private async findReferences(path: string): Promise<boolean> {
    for (const note of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(note);
      if (replaceReferences(content, path, path, note.path).changed || content.includes(path)) return true;
    }
    return false;
  }
}
