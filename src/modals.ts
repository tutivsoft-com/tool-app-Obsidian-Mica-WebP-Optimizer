import { Modal, Notice, Setting, TFolder } from "obsidian";
import type { BatchProgress, CandidateFile, ScanSummary } from "./types";
import { formatBytes } from "./utils";

export class ConfirmScanModal extends Modal {
  private readonly summary: ScanSummary;
  private readonly onConfirm: () => void;
  private confirmed = false;

  constructor(app: ConstructorParameters<typeof Modal>[0], summary: ScanSummary, onConfirm: () => void) { super(app); this.summary = summary; this.onConfirm = onConfirm; }
  onOpen(): void {
    this.titleEl.setText("Review WebP optimization");
    const { contentEl } = this;
    contentEl.createEl("p", { text: `${this.summary.candidates.length} eligible image(s), ${formatBytes(this.summary.totalBytes)} total. Conversion is local and originals will not be deleted automatically.` });
    if (this.summary.skipped.length) contentEl.createEl("p", { text: `${this.summary.skipped.length} file(s) will be skipped. Unsupported, animated, remote, and excluded files remain untouched.` });
    const list = contentEl.createEl("ul", { cls: "mica-preview-list" });
    for (const file of this.summary.candidates.slice(0, 8)) list.createEl("li", { text: `${file.path} · ${formatBytes(file.size)}` });
    if (this.summary.candidates.length > 8) contentEl.createEl("p", { text: `Plus ${this.summary.candidates.length - 8} more file(s).` });
    new Setting(contentEl).addButton((button) => button.setButtonText("Cancel").onClick(() => this.close())).addButton((button) => button.setCta().setButtonText("Start optimization").onClick(() => { this.confirmed = true; this.close(); this.onConfirm(); }));
  }
  onClose(): void { this.contentEl.empty(); if (!this.confirmed) new Notice("Mica: optimization cancelled."); }
}

export class FolderPickerModal extends Modal {
  private readonly folders: TFolder[];
  private readonly onPick: (folder: TFolder | null | undefined) => void;
  private picked = false;
  constructor(app: ConstructorParameters<typeof Modal>[0], folders: TFolder[], onPick: (folder: TFolder | null | undefined) => void) { super(app); this.folders = folders; this.onPick = onPick; }
  onOpen(): void {
    this.titleEl.setText("Choose a folder");
    const select = this.contentEl.createEl("select", { cls: "mica-folder-select" });
    select.setAttribute("aria-label", "Folder to optimize");
    select.createEl("option", { text: "Complete vault", value: "" });
    for (const folder of this.folders.sort((a, b) => a.path.localeCompare(b.path))) select.createEl("option", { text: folder.path, value: folder.path });
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Cancel").onClick(() => this.close())).addButton((button) => button.setCta().setButtonText("Review files").onClick(() => { this.picked = true; const value = select.value; this.close(); this.onPick(this.folders.find((folder) => folder.path === value) ?? null); }));
  }
  onClose(): void { this.contentEl.empty(); if (!this.picked) this.onPick(undefined); }
}

export class ProgressModal extends Modal {
  private readonly progress: BatchProgress;
  private readonly onCancel: () => void;
  private readonly onPause: () => void;
  private bar!: HTMLProgressElement;
  private status!: HTMLElement;
  private pauseButton!: HTMLButtonElement;
  constructor(app: ConstructorParameters<typeof Modal>[0], progress: BatchProgress, onCancel: () => void, onPause: () => void) { super(app); this.progress = progress; this.onCancel = onCancel; this.onPause = onPause; }
  onOpen(): void {
    this.titleEl.setText("Mica optimization in progress");
    this.bar = this.contentEl.createEl("progress", { attr: { max: "1", value: "0", "aria-label": "Optimization progress" } });
    this.status = this.contentEl.createEl("p", { cls: "mica-progress-status" });
    this.pauseButton = this.contentEl.createEl("button", { text: "Pause" });
    this.pauseButton.addEventListener("click", () => this.onPause());
    const cancel = this.contentEl.createEl("button", { text: "Cancel", cls: "mod-warning" });
    cancel.addEventListener("click", () => this.onCancel());
    this.update(this.progress);
  }
  update(progress: BatchProgress): void {
    if (!this.bar || !this.status) return;
    this.bar.value = progress.total ? progress.completed / progress.total : 1;
    this.status.setText(`${progress.completed}/${progress.total} complete · ${progress.converted} converted · ${progress.skipped} skipped · ${progress.failed} failed${progress.current ? `\n${progress.current}` : ""}`);
    this.pauseButton.setText(progress.paused ? "Resume" : "Pause");
  }
}

export class LargerFileModal extends Modal {
  private readonly source: CandidateFile;
  private readonly outputBytes: number;
  private readonly onChoice: (keepWebp: boolean) => void;
  private chosen = false;
  constructor(app: ConstructorParameters<typeof Modal>[0], source: CandidateFile, outputBytes: number, onChoice: (keepWebp: boolean) => void) { super(app); this.source = source; this.outputBytes = outputBytes; this.onChoice = onChoice; }
  onOpen(): void {
    this.titleEl.setText("WebP is larger than the original");
    this.contentEl.createEl("p", { text: `${this.source.name}: ${formatBytes(this.source.size)} original → ${formatBytes(this.outputBytes)} WebP. Keeping the original avoids unnecessary growth.` });
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Keep original").setCta().onClick(() => { this.chosen = true; this.close(); this.onChoice(false); })).addButton((button) => button.setButtonText("Use WebP").onClick(() => { this.chosen = true; this.close(); this.onChoice(true); }));
  }
  onClose(): void { this.contentEl.empty(); if (!this.chosen) this.onChoice(false); }
}

export class LogModal extends Modal {
  private readonly entries: Array<{ timestamp: string; source: string; output?: string; result: string; reason?: string; sourceBytes: number; outputBytes?: number }>;
  constructor(app: ConstructorParameters<typeof Modal>[0], entries: Array<{ timestamp: string; source: string; output?: string; result: string; reason?: string; sourceBytes: number; outputBytes?: number }>) { super(app); this.entries = entries; }
  onOpen(): void {
    this.titleEl.setText("Mica conversion log");
    const list = this.contentEl.createEl("div", { cls: "mica-log-list" });
    if (!this.entries.length) list.createEl("p", { text: "No conversions have been recorded yet." });
    for (const entry of this.entries.slice().reverse()) list.createEl("p", { text: `${new Date(entry.timestamp).toLocaleString()} · ${entry.result} · ${entry.source}${entry.output ? ` → ${entry.output}` : ""}${entry.reason ? ` (${entry.reason})` : ""}` });
  }
  onClose(): void { this.contentEl.empty(); }
}
