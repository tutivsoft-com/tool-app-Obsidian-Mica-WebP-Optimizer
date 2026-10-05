import { renderNativePacks } from "./native-operations";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import type MicaPlugin from "./main";
import { addBillingAccountSettings } from "./constance-account";

export class MicaSettingTab extends PluginSettingTab {
  constructor(app: ConstructorParameters<typeof PluginSettingTab>[0], private readonly plugin: MicaPlugin) { super(app, plugin); }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Mica WebP Optimizer" });
    containerEl.createEl("p", { text: "Mica converts PNG and JPEG images locally. It writes and verifies the WebP before changing a note, and it never deletes originals automatically." });

    const advanced = this.plugin.settings.settingsMode === "advanced";
    new Setting(containerEl).setName("Settings mode").setDesc("Simple shows everyday controls. Advanced includes detailed behavior and troubleshooting.").addDropdown((dropdown) => dropdown.addOption("simple", "Simple").addOption("advanced", "Advanced").setValue(this.plugin.settings.settingsMode).onChange(async (value) => { this.plugin.settings.settingsMode = value === "advanced" ? "advanced" : "simple"; await this.plugin.saveSettings(); this.display(); }));
    new Setting(containerEl).setName("Watched folders").setDesc("One vault-relative folder per line. Leave empty to watch the complete vault.").addTextArea((text) => text.setValue(this.plugin.settings.watchedFolders.join("\n")).onChange(async (value) => { this.plugin.settings.watchedFolders = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); await this.plugin.saveSettings(); }));
    if (advanced) {
    new Setting(containerEl).setName("Output folder").setDesc("Vault-relative destination. Leave empty to place WebP beside the original.").addText((text) => text.setPlaceholder("Images/WebP").setValue(this.plugin.settings.outputFolder).onChange(async (value) => { this.plugin.settings.outputFolder = value.trim().replace(/^\/|\/$/g, ""); await this.plugin.saveSettings(); }));
    }
    if (advanced) {
    new Setting(containerEl).setName("Convert existing images at startup").setDesc("Scan the vault and convert eligible images once after Obsidian finishes loading. Off by default.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoConvertImagesAtStart).onChange(async (value) => { this.plugin.settings.autoConvertImagesAtStart = value; this.plugin.settings.automaticConsumptionApproved = value; await this.plugin.saveSettings(); }));
    }
    new Setting(containerEl).setName("Automatic optimization").setDesc("Explicitly enable background conversions. Each image requires server authorization and consumes one native unit; existing settings do not opt you in automatically.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoOptimize).onChange(async (value) => { this.plugin.settings.autoOptimize = value; this.plugin.settings.automaticConsumptionApproved = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Review before conversion").setDesc("Preview eligible images before conversion. Recommended when changing watched folders or quality.").addToggle((toggle) => toggle.setValue(this.plugin.settings.reviewBeforeApply).onChange(async (value) => { this.plugin.settings.reviewBeforeApply = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Billing").setHeading();
    const balanceSummary = containerEl.createEl("p", { cls: "mica-billing-summary", attr: { role: "status", "aria-live": "polite" } });
    const renderBalanceSummary = () => balanceSummary.setText(!this.plugin.settings.billingAccountLinked || !this.plugin.settings.billingAccessToken ? "Create an account or sign in, then Connect to activate your lifetime free allowance and confirm your balance." : `Cached lifetime starter units remaining: ${this.plugin.settings.freeConversionsRemaining}. Maximum five successful trial operations; Constance authorizes actual remaining units. Purchased balance: ${this.plugin.settings.purchasedConversions.toLocaleString()} conversion(s).`);
    this.plugin.billingSummaryRefresh = renderBalanceSummary;
    renderBalanceSummary();
    addBillingAccountSettings(containerEl, { state: this.plugin.settings, appId: "mica-webp-optimizer", installationId: this.plugin.settings.constanceDeviceId, appVersion: this.plugin.manifest.version, persist: () => this.plugin.saveSettings(), syncBalance: () => this.plugin.reconcileBilling(), refresh: () => this.display() });
    new Setting(containerEl).setName("Purchased balance").setDesc("Refreshes your connected account balance and retries pending credit spends. Scans, previews, skips, and rollback never use credits.").addButton((button) => button.setButtonText("Refresh balance").onClick(async () => { button.setDisabled(true); try { await this.plugin.reconcileBilling(true); new Notice("Mica: balance check complete."); this.display(); } catch { new Notice("Mica: balance could not be refreshed. Check your connection and account, then retry."); } finally { button.setDisabled(false); } }));
    void renderNativePacks(containerEl,{app:this.app,settings:this.plugin.settings,persistNative:()=>this.plugin.saveSettings()},"mica-webp-optimizer",async plan=>{const {openAccountCheckoutByPrice}=await import("./billing-checkout");await openAccountCheckoutByPrice({state:this.plugin.settings,appId:"mica-webp-optimizer",installationId:this.plugin.settings.constanceDeviceId,persist:()=>this.plugin.saveSettings(),syncBalance:()=>this.plugin.reconcileBilling(),refreshSession:async()=>{const a=await import("./constance-account");return a.refreshBillingSession(this.plugin.settings,()=>this.plugin.saveSettings());}},plan);});

    new Setting(containerEl).setName("Quality").setHeading();
    if (advanced) {
    new Setting(containerEl).setName("Quality mode").setDesc("Lossy is compact. Near-lossless uses the browser's highest WebP quality and is a conservative local fallback.").addDropdown((dropdown) => dropdown.addOption("lossy", "Lossy").addOption("near-lossless", "Near-lossless").setValue(this.plugin.settings.qualityMode).onChange(async (value) => { this.plugin.settings.qualityMode = value as "lossy" | "near-lossless"; await this.plugin.saveSettings(); }));
    }
    new Setting(containerEl).setName("Lossy quality").setDesc("1–100. The default 82 is a balanced screenshot setting.").addDropdown((dropdown) => dropdown.addOption("65", "65 — smaller files").addOption("82", "82 — balanced (recommended)").addOption("92", "92 — more detail").addOption("100", "100 — highest quality").addOptions([65, 82, 92, 100].includes(this.plugin.settings.quality) ? {} : { [String(this.plugin.settings.quality)]: `${this.plugin.settings.quality} — current quality` }).setValue(String(this.plugin.settings.quality)).onChange(async (value) => { this.plugin.settings.quality = Number(value); await this.plugin.saveSettings(); }));
    if (advanced) {
    new Setting(containerEl).setName("Maximum dimension").setDesc("Longest edge in pixels. Keep original is recommended unless you need smaller images.").addDropdown((dropdown) => dropdown.addOptions({ [String(this.plugin.settings.maxDimension)]: `${this.plugin.settings.maxDimension || "Original"} · current`, "0": "Keep original (recommended)", "1280": "1,280 pixels · compact", "1920": "1,920 pixels · full HD", "2560": "2,560 pixels · detailed", "4096": "4,096 pixels · high resolution" }).setValue(String(this.plugin.settings.maxDimension)).onChange(async (value) => { this.plugin.settings.maxDimension = Number(value); await this.plugin.saveSettings(); }));
    }

    if (advanced) {
    this.plugin.support.addDiagnosticsSetting(containerEl);
    new Setting(containerEl).setName("Metadata").setHeading();
    new Setting(containerEl).setName("Metadata policy").setDesc(this.plugin.settings.metadataPolicy === "strip" ? "Strip EXIF, device, location, and embedded profile metadata where the encoder supports it. This is the privacy-first default." : "Keep recognized EXIF, ICC, and XMP chunks when the local WebP container accepts them; unsupported metadata is reported.").addDropdown((dropdown) => dropdown.addOption("strip", "Strip unnecessary metadata").addOption("keep", "Keep when supported").setValue(this.plugin.settings.metadataPolicy).onChange(async (value) => { this.plugin.settings.metadataPolicy = value as "strip" | "keep"; await this.plugin.saveSettings(); this.display(); }));

    new Setting(containerEl).setName("Original files").setHeading();
    new Setting(containerEl).setName("After conversion").setDesc("Keep is safest. Backup moves the original into a recoverable vault folder. Review leaves it in place and flags conversions without safe references.").addDropdown((dropdown) => dropdown.addOption("keep", "Keep beside WebP").addOption("backup", "Move to backup folder").addOption("review", "Keep and require review").setValue(this.plugin.settings.originalHandling).onChange(async (value) => { this.plugin.settings.originalHandling = value as "keep" | "backup" | "review"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Backup folder").setDesc("Used with Move to backup folder. Default: .mica-backups; originals stay available for rollback.").addText((text) => text.setValue(this.plugin.settings.backupFolder).onChange(async (value) => { const cleaned = value.trim().replace(/^\/|\/$/g, ""); this.plugin.settings.backupFolder = cleaned || ".mica-backups"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Ask when WebP is larger").setDesc("Ask before keeping a WebP larger than its source. Otherwise Mica keeps the original and skips the larger output.").addToggle((toggle) => toggle.setValue(this.plugin.settings.showLargerFilePrompt).onChange(async (value) => { this.plugin.settings.showLargerFilePrompt = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Performance").setHeading();
    new Setting(containerEl).setName("Concurrent conversions").setDesc("1–4 local encodes at once. Default: 2. Choose 1 on low-memory devices; note rewrites remain serialized.").addSlider((slider) => slider.setLimits(1, 4, 1).setValue(this.plugin.settings.concurrency).setDynamicTooltip().onChange(async (value) => { this.plugin.settings.concurrency = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Review conversion log").setDesc(`${this.plugin.settings.log.length} recent event(s) retained locally.`).addButton((button) => button.setButtonText("Open log").onClick(() => this.plugin.openLog()));
    new Setting(containerEl).setName("Rollback most recent batch").setDesc("Restores note text and backed-up originals when they are still available.").addButton((button) => button.setButtonText("Rollback").setWarning().onClick(() => { void this.plugin.rollbackLastBatch(); }));
    }
    containerEl.createEl("p", { cls: "mica-privacy-note", text: "Privacy: conversion stays local and vault media is never uploaded. Account billing verifies free allowances and purchased credits; scans, previews, skips, and rollback are free. See PRIVACY.md for the threat model." });
  }
}
