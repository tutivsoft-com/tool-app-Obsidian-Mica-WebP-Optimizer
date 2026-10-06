import { selectedFiles, markdownFile, registerSelectionAction } from "./selection-scope";
import { diagnostics } from "./diagnostics";
import { Modal } from "obsidian";
import { Menu, Notice, Plugin, TFile, TFolder } from "obsidian";
import { retryPendingSpendEvents, spendPurchasedConversion, syncPurchasedConversions, withBillingLock } from "./billing";
import { createBillingEventId, FREE_CONVERSIONS_PER_DAY, localCalendarDate } from "./billing-policy";
import { reserveNative, renderNativePacks, jobId, digest, recoverNative } from "./native-operations";
import { claimAccountFreeUsage } from "./constance-account";
import { convertToWebp } from "./converter";
import { ConfirmScanModal, FolderPickerModal, LargerFileModal, LogModal, ProgressModal } from "./modals";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import { MicaSettingTab } from "./settings-tab";
import type { BatchJournal, BatchJournalEntry, BatchProgress, ConversionLogEntry, MicaSettings } from "./types";
import { baseOutputPath, isAnimatedImage, isSupportedPath, isWatched, isWithinFolder, normalizePath, replaceReferences, scanSummary, stableHash, uniqueOutputPath } from "./utils";
import { PluginSupport } from "./plugin-support";

const PLUGIN_NAME = "Mica";
const makeId = (): string => {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export default class MicaPlugin extends Plugin {
  declare settings: MicaSettings;
  support!: PluginSupport;
  billingSummaryRefresh?: () => void;
  private queue: TFile[] = [];
  private queued = new Set<string>();
  private processing = false;
  private cancelRequested = false;
  private paused = false;
  private batchBillingStopped = false;
  private batchBillingNotices = new Set<string>();
  private noCreditsNoticeShown = false;
  private autoOptimizationBlockedForCredits = false;
  private progressModal: ProgressModal | null = null;
  private progress: BatchProgress = { total: 0, completed: 0, converted: 0, skipped: 0, failed: 0, current: "", paused: false, cancelled: false };
  private noteLocks = new Map<string, Promise<void>>();

  async onload(): Promise<void> {
let diagnosticStartupEnd: () => void = () => {};

const diagnosticEnd1 = diagnostics?.start?.("main.onload") ?? (() => {});
try {

    this.support = new PluginSupport(this, { name: "Mica WebP Optimizer", summary: "Convert supported vault images to WebP with preview, backup, reference updates, and rollback.", quickStart: ["Open Mica optimizer.", "Choose a folder or image.", "Review estimated changes before conversion."], commands: ["Optimize images", "View conversion log", "Rollback last batch"], troubleshooting: ["Use Copy diagnostic log before reporting a problem.", "Check that desktop image conversion is available and the file is not animated."] });
    this.support.start();
    this.settings = normalizeSettings(await this.loadData());
diagnosticStartupEnd = diagnostics?.start?.("startup.initialize") ?? (() => {});

    this.ensureBillingState();
    await this.saveSettings();
    this.addRibbonIcon("image", "Mica: optimize images", () => diagnostics.guard("main.event_1", () => (void diagnostics.guard("main.background_2", () => (this.runFolderPicker())))));
    this.addCommand({ id: "scan-current-folder", name: "Scan current folder and optimize", callback: () => this.runCurrentFolder() });
    this.addCommand({ id: "scan-complete-vault", name: "Scan complete vault and optimize", callback: () => this.runScan(null) });
    this.addCommand({ id: "cancel-optimization", name: "Cancel active optimization", callback: () => this.cancel() });
    this.addCommand({ id: "pause-optimization", name: "Pause or resume optimization", callback: () => this.togglePause() });
    this.addCommand({ id: "rollback-last-batch", name: "Rollback most recent optimization batch", callback: () => this.rollbackLastBatch() });
    this.addCommand({ id: "view-conversion-log", name: "View conversion log", callback: () => this.openLog() });
    registerSelectionAction(this, { name: "Mica: Optimize selected images", icon: "image", accepts: file => isSupportedPath(file.path) && !this.isExcludedPath(file.path),
      run: files => this.runScan(null, undefined, files) });
    this.addSettingTab(new MicaSettingTab(this.app, this));
    this.support.showWelcome();
    void diagnostics.guard("main.background_3", () => (this.reconcileBilling()));
    this.app.workspace.onLayoutReady(() => {
return diagnostics.guard("main.event_4", () => {
      if (this.settings.automaticConsumptionApproved && this.settings.billingAccountLinked && this.settings.autoConvertImagesAtStart) void diagnostics.guard("main.background_5", () => (this.runScan(null)));
      this.registerEvent(this.app.vault.on("create", (file) => {
return diagnostics.guard("main.event_6", () => { if (file instanceof TFile) this.scheduleAutoOptimize(file);
});
}));
      this.registerEvent(this.app.vault.on("modify", (file) => {
return diagnostics.guard("main.event_7", () => { if (file instanceof TFile) this.scheduleAutoOptimize(file);
});
}));

});
});
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
return diagnostics.guard("main.event_8", () => { if (file instanceof TFile || file instanceof TFolder) this.addFileMenu(menu, file);
});
}));
    this.registerEvent(this.app.workspace.on("editor-menu", (menu) => diagnostics.guard("main.event_9", () => (this.addEditorMenu(menu)))));

} catch (diagnosticError1) { diagnostics?.failure?.("main.onload", diagnosticError1); throw diagnosticError1; } finally { diagnosticStartupEnd();  diagnostics?.legacy?.("info", "startup.finished"); diagnosticEnd1(); }
}

  onunload(): void {
return diagnostics.guard("main.onunload_10", () => {
const diagnosticAction2 = () => {
 this.cancelRequested = true; this.progressModal?.close();
}; return diagnostics?.run ? diagnostics.run("main.onunload", diagnosticAction2) : diagnosticAction2();

});
}
  async saveSettings(): Promise<void> {
const diagnosticEnd3 = diagnostics?.start?.("main.saveSettings") ?? (() => {});
try {
 await this.saveData(this.settings);
} catch (diagnosticError3) { diagnostics?.failure?.("main.saveSettings", diagnosticError3); throw diagnosticError3; } finally { diagnosticEnd3(); }
}
  refreshBillingSummary(): void { this.billingSummaryRefresh?.(); }
  async reconcileBilling(strict = false): Promise<void> {
const diagnosticEnd4 = diagnostics?.start?.("main.reconcileBilling") ?? (() => {});
try {

    await recoverNative({app:this.app,settings:this.settings,persistNative:()=>this.saveSettings()});
    await syncPurchasedConversions(this, strict);
    await retryPendingSpendEvents(this);
    await withBillingLock(this, () => this.reconcileCommittedFreeUsage());
    this.refreshBillingSummary();
    if (this.settings.freeConversionsRemaining > 0 || this.settings.purchasedConversions > 0) {
      this.noCreditsNoticeShown = false;
      this.autoOptimizationBlockedForCredits = false;
    }

} catch (diagnosticError4) { diagnostics?.failure?.("main.reconcileBilling", diagnosticError4); throw diagnosticError4; } finally { diagnosticEnd4(); }
}
  openLog(): void { new LogModal(this.app, this.settings.log).open(); }

  private ensureBillingState(): void {
    if (!this.settings.constanceDeviceId) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      this.settings.constanceDeviceId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    const today = localCalendarDate();
    if (this.settings.freeAllowanceDate !== today) {
      this.settings.freeAllowanceDate = today;
      // Server-owned lifetime allowance never resets at UTC rollover.
      this.noCreditsNoticeShown = false;
      this.autoOptimizationBlockedForCredits = false;
    }
  }

  private async reconcileCommittedFreeUsage(): Promise<boolean> {
const diagnosticEnd5 = diagnostics?.start?.("main.reconcileCommittedFreeUsage") ?? (() => {});
try {

    for (const pending of [...this.settings.pendingFreeUsageEvents].filter(item => item.outputCommitted)) {
      const result = await claimAccountFreeUsage(this.settings, "mica-webp-optimizer", this.settings.constanceDeviceId, pending.eventId, pending.amount, () => this.saveSettings());
      if (result.kind === "error" || result.kind === "auth-required") return false;
      if (result.kind === "insufficient") {
        const paid = await spendPurchasedConversion(this, pending.eventId);
        if (paid.kind !== "ok") return false;
        this.settings.purchasedConversions = paid.balance;
      } else this.settings.freeConversionsRemaining = result.remaining;
      this.settings.pendingFreeUsageEvents = this.settings.pendingFreeUsageEvents.filter(item => item.eventId !== pending.eventId);
      try { await this.saveSettings(); }
      catch (caughtError11) {
diagnostics.failure("main.caught_12", caughtError11); this.settings.pendingFreeUsageEvents.push(pending); return false; }
    }
    return true;

} catch (diagnosticError5) { diagnostics?.failure?.("main.reconcileCommittedFreeUsage", diagnosticError5); throw diagnosticError5; } finally { diagnosticEnd5(); }
}

  private async chargeConversion(): Promise<"verified" | "pending" | "denied"> {
const diagnosticEnd6 = diagnostics?.start?.("main.chargeConversion") ?? (() => {});
try {

    return await (withBillingLock(this, async () => {
const diagnosticEnd7 = diagnostics?.start?.("main.background.7097") ?? (() => {});
try {

      if (this.batchBillingStopped) return "denied";
      if (!(await this.reconcileCommittedFreeUsage()) || this.settings.pendingSpendEvents.length > 0) {
        return await (this.stopBatchForBilling("usage-recovery", "Mica: a saved conversion is awaiting billing confirmation. Reconnect or refresh balance before converting more images."));
      }
      this.ensureBillingState();
      if (!this.settings.billingAccessToken || !this.settings.billingAccountLinked) {
        return await (this.stopBatchForBilling("billing-account", "Mica: sign in or create an account in plugin settings before converting. This batch has stopped."));
      }
      const pendingFreeUsage = this.settings.pendingFreeUsageEvents.find((item) => item.amount === 1) ?? { eventId: `free_${createBillingEventId()}`, amount: 1, outputCommitted: true };
      pendingFreeUsage.outputCommitted = true;
      if (!this.settings.pendingFreeUsageEvents.some((item) => item.eventId === pendingFreeUsage.eventId)) {
        this.settings.pendingFreeUsageEvents = [...this.settings.pendingFreeUsageEvents, pendingFreeUsage];
      }
      try { await this.saveSettings(); }
      catch (error) {
diagnostics.failure("main.caught_13", error);
        this.settings.pendingFreeUsageEvents = this.settings.pendingFreeUsageEvents.filter(item => item.eventId !== pendingFreeUsage.eventId);
        throw error;
      }
      const free = await claimAccountFreeUsage(this.settings, "mica-webp-optimizer", this.settings.constanceDeviceId, pendingFreeUsage.eventId, pendingFreeUsage.amount, () => this.saveSettings());
      if (free.kind === "ok") {
        this.settings.pendingFreeUsageEvents = this.settings.pendingFreeUsageEvents.filter((item) => item.eventId !== pendingFreeUsage.eventId);
        this.settings.freeConversionsRemaining = free.remaining;
        try { await this.saveSettings(); return "verified"; }
        catch (caughtError14) {
diagnostics.failure("main.caught_15", caughtError14);
          this.settings.pendingFreeUsageEvents.push(pendingFreeUsage);
          this.batchBillingStopped = true;
          this.notifyBillingOnce("free-receipt", "Mica: conversion saved. Refresh your balance to confirm the charge.");
          return "pending";
        }
      }
      if (free.kind === "auth-required") {
        this.settings.billingAccessToken = "";
        this.settings.billingRefreshToken = "";
        this.settings.billingAccessTokenExpiresAt = 0;
        this.settings.billingAccountLinked = false;
        try { await this.saveSettings(); } catch (caughtError16) {
diagnostics.failure("main.caught_17", caughtError16); /* The pre-claim journal remains durable. */ }
        this.stopBatchForBilling("billing-session", "Mica: this conversion is saved. Connect again to confirm its allowance; this batch has stopped.");
        return "pending";
      }
      if (free.kind === "error") {
        this.stopBatchForBilling("allowance-check", "Mica: this conversion is saved while its allowance is verified. Nothing else in this batch will be converted.");
        return "pending";
      }
      this.settings.pendingFreeUsageEvents = this.settings.pendingFreeUsageEvents.filter((item) => item.eventId !== pendingFreeUsage.eventId);
      this.settings.freeConversionsRemaining = 0;
      try { await this.saveSettings(); }
      catch (caughtError18) {
diagnostics.failure("main.caught_19", caughtError18);
        this.settings.pendingFreeUsageEvents.push(pendingFreeUsage);
        this.batchBillingStopped = true;
        return "pending";
      }
      if (this.settings.pendingSpendEvents.length > 0) {
        return await (this.stopBatchForBilling("spend-reconciliation", "Mica: a previous charge is still being confirmed. This batch has stopped; try again when the connection is restored."));
      }
      const paidEventId = createBillingEventId();
      const result = await spendPurchasedConversion(this, paidEventId);
      if (result.kind === "ok") {
        this.settings.purchasedConversions = result.balance;
        try {
          await this.saveSettings();
          return "verified";
        } catch (error) {
diagnostics.failure("main.caught_20", error);
          this.settings.pendingSpendEvents.push({ eventId: paidEventId, amount: 1 });
          this.batchBillingStopped = true;
          diagnostics?.legacy?.("error", "main.mica_purchased_balance_could_not_be_saved_after_a_successful_spen");
          this.notifyBillingOnce("balance-save", "Mica: this conversion is saved, but the updated balance could not be stored. Reopen Mica to refresh it.");
          return "pending";
        }
      }
      if (result.kind === "insufficient") {
        this.batchBillingStopped = true;
        this.autoOptimizationBlockedForCredits = true;
        this.queue = [];
        this.queued.clear();
        if (!this.noCreditsNoticeShown) {
          this.noCreditsNoticeShown = true;
          new Notice("Mica: no free or purchased conversion credits remain. This batch has stopped. Add credits in Settings.");
        }
        return "denied";
      } else {
        // The server may have accepted this idempotent spend before the reply
        // was lost. Keep the verified image so a later reconciliation cannot
        // charge the account for an image we removed.
        this.notifyBillingOnce("spend-pending", "Mica: conversion saved. Its charge is awaiting confirmation. Check your balance when connected.");
        this.batchBillingStopped = true;
        return "pending";
      }

} catch (diagnosticError7) { diagnostics?.failure?.("main.background.7097", diagnosticError7); throw diagnosticError7; } finally { diagnosticEnd7(); }
}));

} catch (diagnosticError6) { diagnostics?.failure?.("main.chargeConversion", diagnosticError6); throw diagnosticError6; } finally { diagnosticEnd6(); }
}

  private stopBatchForBilling(key: string, message: string): "denied" {
    this.batchBillingStopped = true;
    this.notifyBillingOnce(key, message);
    return "denied";
  }

  private notifyBillingOnce(key: string, message: string): void {
    if (this.batchBillingNotices.has(key)) return;
    this.batchBillingNotices.add(key);
    new Notice(message);
  }

  private addFileMenu(menu: Menu, file: TFile | TFolder): void {
    if (file instanceof TFile && isSupportedPath(file.path)) menu.addItem((item) => item.setTitle("Mica: Optimize this image").setIcon("image").onClick(() => {
return diagnostics.guard("main.control_21", () => { const diagnosticAction8 = () => (void diagnostics.guard("main.background_22", () => (this.runScan(file.parent instanceof TFolder ? file.parent : null, file)))); return diagnostics?.run ? diagnostics.run("control.12945.onClick", diagnosticAction8) : diagnosticAction8();
});
}));
    if (file instanceof TFolder) menu.addItem((item) => item.setTitle("Mica: Review folder optimization").setIcon("image").onClick(() => {
return diagnostics.guard("main.control_23", () => { const diagnosticAction9 = () => (void diagnostics.guard("main.background_24", () => (this.runScan(file)))); return diagnostics?.run ? diagnostics.run("control.13162.onClick", diagnosticAction9) : diagnosticAction9();
});
}));
  }

  private addEditorMenu(menu: Menu): void {
    const file = this.app.workspace.getActiveFile();
    if (file && isSupportedPath(file.path)) menu.addItem((item) => item.setTitle("Mica: Optimize images in current folder").onClick(() => {
return diagnostics.guard("main.control_25", () => { const diagnosticAction10 = () => (void diagnostics.guard("main.background_26", () => (this.runCurrentFolder()))); return diagnostics?.run ? diagnostics.run("control.13429.onClick", diagnosticAction10) : diagnosticAction10();
});
}));
  }

  private scheduleAutoOptimize(file: TFile): void {
const diagnosticAction11 = () => {

    this.ensureBillingState();
    if (this.autoOptimizationBlockedForCredits) return;
    if (!this.settings.automaticConsumptionApproved || !this.settings.billingAccountLinked || !this.settings.autoOptimize || !isSupportedPath(file.path) || !isWatched(file.path, this.settings) || this.isExcludedPath(file.path)) return;
    window.setTimeout(() => {
return diagnostics.guard("main.timer_27", () => {
      if (!this.queued.has(file.path)) { this.queue.push(file); this.queued.add(file.path); }
      void diagnostics.guard("main.background_28", () => (this.drainQueue()));

});
}, 500);

}; return diagnostics?.run ? diagnostics.run("main.scheduleAutoOptimize", diagnosticAction11) : diagnosticAction11();
}

  private async runCurrentFolder(): Promise<void> {
const diagnosticEnd12 = diagnostics?.start?.("main.runCurrentFolder") ?? (() => {});
try {

    const file = this.app.workspace.getActiveFile();
    if (!file?.parent || !(file.parent instanceof TFolder)) {
      new Notice(`${PLUGIN_NAME}: open a note in the folder you want to optimize first.`);
      return;
    }
    await this.runScan(file.parent);

} catch (diagnosticError12) { diagnostics?.failure?.("main.runCurrentFolder", diagnosticError12); throw diagnosticError12; } finally { diagnosticEnd12(); }
}

  private async runFolderPicker(): Promise<void> {
const diagnosticEnd13 = diagnostics?.start?.("main.runFolderPicker") ?? (() => {});
try {

    const folders = this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder);
    new FolderPickerModal(this.app, folders, (folder) => { if (folder !== undefined) void diagnostics.guard("main.background_29", () => (this.runScan(folder))); }).open();

} catch (diagnosticError13) { diagnostics?.failure?.("main.runFolderPicker", diagnosticError13); throw diagnosticError13; } finally { diagnosticEnd13(); }
}

  private isExcludedPath(path: string): boolean {
    const normalized = normalizePath(path);
    // Output files are WebP and therefore fail the supported-extension check;
    // do not exclude PNG/JPEG sources merely because the user chose the same
    // folder for output.
    return isWithinFolder(normalized, this.settings.backupFolder);
  }

  private async collectFiles(folder: TFolder | null): Promise<{ files: TFile[]; skippedAnimated: TFile[]; skippedUnsupported: TFile[] }> {
const diagnosticEnd14 = diagnostics?.start?.("main.collectFiles") ?? (() => {});
try {

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

} catch (diagnosticError14) { diagnostics?.failure?.("main.collectFiles", diagnosticError14); throw diagnosticError14; } finally { diagnosticEnd14(); }
}

  private async runScan(folder: TFolder | null, singleFile?: TFile, selectedFiles?: TFile[]): Promise<void> {
const diagnosticEnd15 = diagnostics?.start?.("main.runScan") ?? (() => {});
try {

    if (this.processing) { new Notice(`${PLUGIN_NAME}: another optimization is already running.`); return; }
    if (singleFile && (!isSupportedPath(singleFile.path) || this.isExcludedPath(singleFile.path))) { new Notice(`${PLUGIN_NAME}: this image is unsupported or excluded from optimization.`); return; }
    let collected = selectedFiles ? { files: [] as TFile[], skippedAnimated: [] as TFile[], skippedUnsupported: [] as TFile[] } : singleFile
      ? (isAnimatedImage(await this.app.vault.readBinary(singleFile), singleFile.extension) ? { files: [] as TFile[], skippedAnimated: [singleFile], skippedUnsupported: [] as TFile[] } : { files: [singleFile], skippedAnimated: [] as TFile[], skippedUnsupported: [] as TFile[] })
      : await this.collectFiles(folder);
    if (selectedFiles) {
      collected = { files: [], skippedAnimated: [], skippedUnsupported: [] };
      for (const file of selectedFiles) {
        if (!isSupportedPath(file.path) || this.isExcludedPath(file.path)) { collected.skippedUnsupported.push(file); continue; }
        if (isAnimatedImage(await this.app.vault.readBinary(file), file.extension)) collected.skippedAnimated.push(file);
        else collected.files.push(file);
      }
    }
    const selected = collected.files;
    const summary = scanSummary(selected.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size })), { ...this.settings, watchedFolders: folder ? [folder.path] : [] });
    summary.skipped.push(...collected.skippedAnimated.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size, reason: "Animated PNG" })));
    summary.skipped.push(...collected.skippedUnsupported.map((file) => ({ path: file.path, name: file.name, extension: file.extension, size: file.stat.size, reason: "Unsupported file type" })));
    if (!summary.candidates.length) { new Notice(`${PLUGIN_NAME}: no eligible PNG or JPEG images were found.`); return; }
    const eligible = selected.filter((file) => summary.candidates.some((candidate) => candidate.path === file.path));
    if (this.settings.reviewBeforeApply) new ConfirmScanModal(this.app, summary, () => void diagnostics.guard("main.background_30", () => (this.optimizeFiles(eligible)))).open();
    else void diagnostics.guard("main.background_31", () => (this.optimizeFiles(eligible)));

} catch (diagnosticError15) { diagnostics?.failure?.("main.runScan", diagnosticError15); throw diagnosticError15; } finally { diagnosticEnd15(); }
}

  private updateProgress(patch: Partial<BatchProgress>): void {
    this.progress = { ...this.progress, ...patch, paused: this.paused, cancelled: this.cancelRequested };
    this.progressModal?.update(this.progress);
  }

  private preservedConversions=new Map<string,{eventId:string;sourceHash:string;conversion:Awaited<ReturnType<typeof convertToWebp>>}>();

  private async optimizeFiles(files: TFile[]): Promise<void> {
const diagnosticEnd16 = diagnostics?.start?.("main.optimizeFiles") ?? (() => {});
try {

    if(!this.settings.billingAccessToken || !this.settings.billingAccountLinked){new Notice("Connect your account in plugin settings to use your free conversions.");return;}
    if (this.processing) return;
    this.processing = true;
    this.batchBillingStopped = false;
    this.batchBillingNotices.clear();
    this.cancelRequested = false;
    this.paused = false;
    this.progress = { total: files.length, completed: 0, converted: 0, skipped: 0, failed: 0, current: "", paused: false, cancelled: false };
    this.progressModal = new ProgressModal(this.app, this.progress, () => this.cancel(), () => this.togglePause());
    if (this.support.automaticWindowsEnabled()) this.progressModal.open();
    else new Notice(`${PLUGIN_NAME}: conversion started. Use the cancel command to stop it.`);
    const journal: BatchJournal = { id: makeId(), startedAt: new Date().toISOString(), entries: [] };
    this.settings.lastBatch = journal;
    await this.saveSettings();
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
const diagnosticEnd17 = diagnostics?.start?.("main.worker") ?? (() => {});
try {

      while (!this.cancelRequested && !this.batchBillingStopped) {
        await this.waitIfPaused();
        if (this.cancelRequested || this.batchBillingStopped) return;
        const index = nextIndex++;
        if (index >= files.length) return;
        const file = files[index];
        this.updateProgress({ current: file.path });
        try {
          const result = await this.optimizeOne(file, journal);
          this.updateProgress({ completed: this.progress.completed + 1, converted: this.progress.converted + (result === "converted" ? 1 : 0), skipped: this.progress.skipped + (result === "skipped" ? 1 : 0) });
        } catch (error) {
diagnostics.failure("main.caught_32", error);
          const reason = error instanceof Error ? error.message : "Unexpected conversion failure.";
          this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, sourceBytes: file.stat.size, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "failed", reason });
          this.updateProgress({ completed: this.progress.completed + 1, failed: this.progress.failed + 1 });
        }
        await this.saveSettings();
        await new Promise<void>((resolve) => window.setTimeout(diagnostics.wrap("main.timer_33", resolve), 0));
      }

} catch (diagnosticError17) { diagnostics?.failure?.("main.worker", diagnosticError17); throw diagnosticError17; } finally { diagnosticEnd17(); }
};
    await Promise.all(Array.from({ length: Math.min(this.settings.concurrency, files.length) }, () => worker()));
    journal.completedAt = new Date().toISOString();
    await this.saveSettings();
    const cancelled = this.cancelRequested;
    this.processing = false;
    this.progressModal?.close();
    this.progressModal = null;
    if (!this.batchBillingStopped) new Notice(`${PLUGIN_NAME}: ${cancelled ? "cancelled" : "batch complete"} — ${this.progress.converted} converted, ${this.progress.skipped} skipped, ${this.progress.failed} failed.`);
    // Events received during a batch remain queued until the active worker exits.
    if (this.queue.length > 0 && !cancelled && !this.batchBillingStopped) void diagnostics.guard("main.background_34", () => (this.drainQueue()));

} catch (diagnosticError16) { diagnostics?.failure?.("main.optimizeFiles", diagnosticError16); throw diagnosticError16; } finally { diagnosticEnd16(); }
}

  private async waitIfPaused(): Promise<void> {
const diagnosticEnd18 = diagnostics?.start?.("main.waitIfPaused") ?? (() => {});
try {
 while (this.paused && !this.cancelRequested) await new Promise<void>((resolve) => window.setTimeout(diagnostics.wrap("main.timer_35", resolve), 100));
} catch (diagnosticError18) { diagnostics?.failure?.("main.waitIfPaused", diagnosticError18); throw diagnosticError18; } finally { diagnosticEnd18(); }
}
  private togglePause(): void { if (!this.processing) return; this.paused = !this.paused; this.updateProgress({}); }
  private cancel(): void {
const diagnosticAction19 = () => {
 if (!this.processing) { new Notice(`${PLUGIN_NAME}: no optimization is running.`); return; } this.cancelRequested = true; this.queue = []; this.queued.clear(); this.updateProgress({}); new Notice(`${PLUGIN_NAME}: cancellation requested; the current verified file will finish safely.`);
}; return diagnostics?.run ? diagnostics.run("main.cancel", diagnosticAction19) : diagnosticAction19();
}

  private async commitNativeConversion(reservation:import("./native-operations").NativeReservation):Promise<"verified"|"pending"|"denied"> {
const diagnosticEnd20 = diagnostics?.start?.("main.commitNativeConversion") ?? (() => {});
try {
return (await reservation.commit()).kind==="committed" ? "verified" : "pending";
} catch (diagnosticError20) { diagnostics?.failure?.("main.commitNativeConversion", diagnosticError20); throw diagnosticError20; } finally { diagnosticEnd20(); }
}
  private async optimizeOne(file: TFile, journal: BatchJournal): Promise<"converted" | "skipped"> {
const diagnosticEnd21 = diagnostics?.start?.("main.optimizeOne") ?? (() => {});
try {

    const sourceBytes = await this.app.vault.readBinary(file);
    const sourceHash = stableHash(sourceBytes);
    const previous = this.settings.log.find((entry) => entry.source === file.path && entry.result === "converted" && entry.reason?.startsWith(`hash:${sourceHash}:`));
    if (previous?.output && await this.app.vault.adapter.exists(previous.output)) {
      this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: previous.output, sourceBytes: file.stat.size, outputBytes: previous.outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "already-processed", reason: "Verified output already exists." });
      return "skipped";
    }
    const preserved=this.preservedConversions.get(file.path);
    const verifiedSourceHash=await digest(sourceBytes);
    if(preserved && preserved.sourceHash!==verifiedSourceHash)throw new Error("The source image changed. Your original preview is saved. Start a new conversion, which may use additional credits.");
    const conversion = preserved?.conversion || await convertToWebp(sourceBytes, file.extension, this.settings.quality, this.settings.qualityMode, this.settings.maxDimension, this.settings.metadataPolicy);
    const authorization=await reserveNative({app:this.app,settings:this.settings,persistNative:()=>this.saveSettings()},"mica-webp-optimizer",preserved?.eventId || jobId(),verifiedSourceHash,await digest(conversion.bytes),{bytes:sourceBytes.byteLength,pixels:conversion.info.width*conversion.info.height});
    if(!authorization)return "skipped";
    const base = baseOutputPath(file.path, this.settings.outputFolder);
    const outputPath = uniqueOutputPath(base, this.app.vault.getFiles().map((item) => item.path));
    const outputBytes = conversion.bytes.byteLength;
    const outputIsLarger = outputBytes >= sourceBytes.byteLength;
    const candidate = { path: file.path, name: file.name, extension: file.extension, size: sourceBytes.byteLength };
    if (outputIsLarger && this.settings.showLargerFilePrompt) {
      const keepWebp = await this.askKeepLarger(candidate, outputBytes);
      if (!keepWebp) {
        // Release before returning; if the response is lost, the durable journal
        // is reconciled by a later operation-status lookup before any new reserve.
        await authorization.rollback();
        this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "larger-kept-original", reason: "Original retained because WebP was larger." });
        return "skipped";
      }
    }
    if(await digest(await this.app.vault.readBinary(file))!==verifiedSourceHash)throw new Error("The source image changed before saving. Your original preview is saved.");
    if(!await authorization.markWriting([{path:outputPath,binary:true,after:await digest(conversion.bytes)}]))return "skipped";
    await this.ensureFolder(outputPath);
    await this.app.vault.createBinary(outputPath, conversion.bytes);
    try {
      await this.verifyWrittenWebp(outputPath, conversion.bytes);
    } catch (error) {
diagnostics.failure("main.caught_36", error);
      await this.deleteGeneratedOutput(outputPath);
      throw error;
    }
    const journalEntry: BatchJournalEntry = { sourcePath: file.path, outputPath, sourceHash, sourceBytes: sourceBytes.byteLength, noteChanges: [], originalMoved: false };
    journal.entries.push(journalEntry);
    try {
      await this.saveSettings();
    } catch (error) {
diagnostics.failure("main.caught_37", error);
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      throw error;
    }
    let changedNotes: Array<{ path: string; originalContent: string }>;
    try {
      changedNotes = await this.updateReferences(file.path, outputPath);
    } catch (error) {
diagnostics.failure("main.caught_38", error);
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      throw error;
    }
    journalEntry.noteChanges = changedNotes;
    if (changedNotes.length === 0 && this.settings.originalHandling === "review") {
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: outputPath, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "review", reason: "No safe reference was found; original kept." });
      return "skipped";
    }
    try {
      await this.saveSettings();
    } catch (error) {
diagnostics.failure("main.caught_39", error);
      await this.restoreNoteChanges(changedNotes);
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      throw error;
    }
    let billingResult: "verified" | "pending" | "denied" = "denied";
    try {
      billingResult = await this.commitNativeConversion(authorization);
    } catch (error) {
diagnostics.failure("main.caught_40", error);
      await this.restoreNoteChanges(changedNotes);
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      throw error;
    }
    if (billingResult === "denied") {
      await this.restoreNoteChanges(changedNotes);
      this.removeJournalEntry(journal, journalEntry);
      await this.deleteGeneratedOutput(outputPath);
      this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "skipped", reason: "Conversion allowance unavailable." });
      return "skipped";
    }
    if (billingResult === "verified" && this.settings.originalHandling === "backup") {
      const backupPath = uniqueOutputPath(`${this.settings.backupFolder}/${file.path}`, this.app.vault.getFiles().map((item) => item.path));
      await this.ensureFolder(backupPath);
      await this.app.vault.rename(file, backupPath);
      journalEntry.backupPath = backupPath;
      journalEntry.originalMoved = true;
    }
    this.appendLog({ id: makeId(), timestamp: new Date().toISOString(), source: file.path, output: outputPath, sourceBytes: sourceBytes.byteLength, outputBytes, qualityMode: this.settings.qualityMode, quality: this.settings.quality, result: "converted", reason: `hash:${sourceHash}:${conversion.metadataPreserved ? "metadata-kept" : "metadata-stripped"}${outputIsLarger ? ":larger-accepted" : ""}${billingResult === "pending" ? ":billing-pending" : ""}` });
    return "converted";

} catch (diagnosticError21) { diagnostics?.failure?.("main.optimizeOne", diagnosticError21); throw diagnosticError21; } finally { diagnosticEnd21(); }
}

  private async verifyWrittenWebp(path: string, expected: ArrayBuffer): Promise<void> {
const diagnosticEnd22 = diagnostics?.start?.("main.verifyWrittenWebp") ?? (() => {});
try {

    const output = this.app.vault.getAbstractFileByPath(path);
    if (!(output instanceof TFile)) throw new Error("The WebP was not found after writing.");
    const actual = await this.app.vault.readBinary(output);
    if (actual.byteLength !== expected.byteLength) throw new Error("The written WebP did not match the verified conversion.");
    const expectedBytes = new Uint8Array(expected);
    const actualBytes = new Uint8Array(actual);
    for (let index = 0; index < expectedBytes.length; index++) {
      if (expectedBytes[index] !== actualBytes[index]) throw new Error("The written WebP did not match the verified conversion.");
    }

} catch (diagnosticError22) { diagnostics?.failure?.("main.verifyWrittenWebp", diagnosticError22); throw diagnosticError22; } finally { diagnosticEnd22(); }
}

  private async deleteGeneratedOutput(path: string): Promise<void> {
const diagnosticEnd23 = diagnostics?.start?.("main.deleteGeneratedOutput") ?? (() => {});
try {

    const output = this.app.vault.getAbstractFileByPath(path);
    if (output instanceof TFile) await this.app.vault.delete(output).catch((rejectedError1) => { diagnostics.failure("main.rejected_2", rejectedError1); return (undefined); });

} catch (diagnosticError23) { diagnostics?.failure?.("main.deleteGeneratedOutput", diagnosticError23); throw diagnosticError23; } finally { diagnosticEnd23(); }
}

  private removeJournalEntry(journal: BatchJournal, entry: BatchJournalEntry): void {
    const index = journal.entries.indexOf(entry);
    if (index >= 0) journal.entries.splice(index, 1);
  }

  private async restoreNoteChanges(changes: Array<{ path: string; originalContent: string }>): Promise<void> {
const diagnosticEnd24 = diagnostics?.start?.("main.restoreNoteChanges") ?? (() => {});
try {

    for (const change of changes.slice().reverse()) {
      await this.withNoteLock(change.path, async () => {
const diagnosticEnd25 = diagnostics?.start?.("main.background.29485") ?? (() => {});
try {

        const note = this.app.vault.getAbstractFileByPath(change.path);
        if (note instanceof TFile) await this.app.vault.modify(note, change.originalContent);

} catch (diagnosticError25) { diagnostics?.failure?.("main.background.29485", diagnosticError25); throw diagnosticError25; } finally { diagnosticEnd25(); }
});
    }

} catch (diagnosticError24) { diagnostics?.failure?.("main.restoreNoteChanges", diagnosticError24); throw diagnosticError24; } finally { diagnosticEnd24(); }
}

  private askKeepLarger(source: { path: string; name: string; extension: string; size: number }, outputBytes: number): Promise<boolean> {
    return new Promise((resolve) => new LargerFileModal(this.app, source, outputBytes, resolve).open());
  }

  private async updateReferences(sourcePath: string, outputPath: string): Promise<Array<{ path: string; originalContent: string }>> {
const diagnosticEnd26 = diagnostics?.start?.("main.updateReferences") ?? (() => {});
try {

    const changes: Array<{ path: string; originalContent: string }> = [];
    try {
      for (const note of this.app.vault.getMarkdownFiles()) {
        await this.withNoteLock(note.path, async () => {
const diagnosticEnd27 = diagnostics?.start?.("main.background.30257") ?? (() => {});
try {

          const original = await this.app.vault.read(note);
          const updated = replaceReferences(original, sourcePath, outputPath, note.path);
          if (!updated.changed) return;
          changes.push({ path: note.path, originalContent: original });
          await this.app.vault.modify(note, updated.content);

} catch (diagnosticError27) { diagnostics?.failure?.("main.background.30257", diagnosticError27); throw diagnosticError27; } finally { diagnosticEnd27(); }
});
      }
    } catch (error) {
diagnostics.failure("main.caught_41", error);
      for (const change of changes.slice().reverse()) {
        const note = this.app.vault.getAbstractFileByPath(change.path);
        if (note instanceof TFile) await this.app.vault.modify(note, change.originalContent).catch((rejectedError3) => { diagnostics.failure("main.rejected_4", rejectedError3); return (undefined); });
      }
      throw error;
    }
    return await (changes);

} catch (diagnosticError26) { diagnostics?.failure?.("main.updateReferences", diagnosticError26); throw diagnosticError26; } finally { diagnosticEnd26(); }
}

  private async withNoteLock(path: string, operation: () => Promise<void>): Promise<void> {
const diagnosticEnd28 = diagnostics?.start?.("main.withNoteLock") ?? (() => {});
try {

    const previous = this.noteLocks.get(path) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    this.noteLocks.set(path, current);
    try { await current; } finally { if (this.noteLocks.get(path) === current) this.noteLocks.delete(path); }

} catch (diagnosticError28) { diagnostics?.failure?.("main.withNoteLock", diagnosticError28); throw diagnosticError28; } finally { diagnosticEnd28(); }
}

  private async drainQueue(): Promise<void> {
const diagnosticEnd29 = diagnostics?.start?.("main.drainQueue") ?? (() => {});
try {

    if (this.processing || this.queue.length === 0) return;
    const files = this.queue.splice(0);
    for (const file of files) this.queued.delete(file.path);
    await this.optimizeFiles(files.filter((file) => file.parent && isSupportedPath(file.path)));

} catch (diagnosticError29) { diagnostics?.failure?.("main.drainQueue", diagnosticError29); throw diagnosticError29; } finally { diagnosticEnd29(); }
}

  private appendLog(entry: ConversionLogEntry): void { this.settings.log.push(entry); this.settings.log = this.settings.log.slice(-500); }

  private async ensureFolder(path: string): Promise<void> {
const diagnosticEnd30 = diagnostics?.start?.("main.ensureFolder") ?? (() => {});
try {

    const parts = normalizePath(path).split("/").slice(0, -1);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) await this.app.vault.createFolder(current).catch((rejectedError5) => { diagnostics.failure("main.rejected_6", rejectedError5); return (undefined); });
    }

} catch (diagnosticError30) { diagnostics?.failure?.("main.ensureFolder", diagnosticError30); throw diagnosticError30; } finally { diagnosticEnd30(); }
}

  async rollbackLastBatch(): Promise<void> {
const diagnosticEnd31 = diagnostics?.start?.("main.rollbackLastBatch") ?? (() => {});
try {

    if (this.processing) { new Notice(`${PLUGIN_NAME}: wait for the active optimization to finish before rolling back.`); return; }
    const journal = this.settings.lastBatch;
    if (!journal?.entries.length) { new Notice(`${PLUGIN_NAME}: there is no recoverable batch.`); return; }
    let restored = 0;
    for (const entry of journal.entries.slice().reverse()) {
      for (const noteChange of entry.noteChanges.slice().reverse()) {
        const note = this.app.vault.getAbstractFileByPath(noteChange.path);
        if (note instanceof TFile) await this.app.vault.modify(note, noteChange.originalContent).catch((rejectedError7) => { diagnostics.failure("main.rejected_8", rejectedError7); return (undefined); });
      }
      if (entry.backupPath) {
        const backup = this.app.vault.getAbstractFileByPath(entry.backupPath);
        if (backup instanceof TFile && !(await this.app.vault.adapter.exists(entry.sourcePath))) await this.app.vault.rename(backup, entry.sourcePath).catch((rejectedError9) => { diagnostics.failure("main.rejected_10", rejectedError9); return (undefined); });
      }
      if (entry.outputPath && this.app.vault.getAbstractFileByPath(entry.outputPath) instanceof TFile) {
        const references = await this.findReferences(entry.outputPath);
        if (!references) await this.app.vault.delete(this.app.vault.getAbstractFileByPath(entry.outputPath) as TFile).catch((rejectedError11) => { diagnostics.failure("main.rejected_12", rejectedError11); return (undefined); });
      }
      restored++;
    }
    this.settings.lastBatch = null;
    await this.saveSettings();
    new Notice(`${PLUGIN_NAME}: rollback restored ${restored} conversion(s).`);

} catch (diagnosticError31) { diagnostics?.failure?.("main.rollbackLastBatch", diagnosticError31); throw diagnosticError31; } finally { diagnosticEnd31(); }
}

  private async findReferences(path: string): Promise<boolean> {
const diagnosticEnd32 = diagnostics?.start?.("main.findReferences") ?? (() => {});
try {

    for (const note of this.app.vault.getMarkdownFiles()) {
      const content = await this.app.vault.read(note);
      if (replaceReferences(content, path, path, note.path).changed || content.includes(path)) return true;
    }
    return false;

} catch (diagnosticError32) { diagnostics?.failure?.("main.findReferences", diagnosticError32); throw diagnosticError32; } finally { diagnosticEnd32(); }
}
}
