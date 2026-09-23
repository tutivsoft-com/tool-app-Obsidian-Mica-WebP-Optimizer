import { Notice, PluginSettingTab, Setting } from "obsidian";
import { isPlaceholderPriceId, MICA_PACKS, MICA_PRICE_IDS, openCheckout } from "./billing";
import type MicaPlugin from "./main";
import { addBillingAccountSettings } from "./constance-account";

export class MicaSettingTab extends PluginSettingTab {
  constructor(app: ConstructorParameters<typeof PluginSettingTab>[0], private readonly plugin: MicaPlugin) { super(app, plugin); }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Mica WebP Optimizer" });
    containerEl.createEl("p", { text: "Mica converts PNG and JPEG images locally. It writes and verifies the WebP before changing a note, and it never deletes originals automatically." });

    new Setting(containerEl).setName("Watched folders").setDesc("One vault-relative folder per line. Leave empty to watch the complete vault.").addTextArea((text) => text.setValue(this.plugin.settings.watchedFolders.join("\n")).onChange(async (value) => { this.plugin.settings.watchedFolders = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Output folder").setDesc("Vault-relative destination. Leave empty to place WebP beside the original.").addText((text) => text.setPlaceholder("Images/WebP").setValue(this.plugin.settings.outputFolder).onChange(async (value) => { this.plugin.settings.outputFolder = value.trim().replace(/^\/|\/$/g, ""); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Automatic optimization").setDesc("Queue newly created or imported PNG and JPEG files in watched folders.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoOptimize).onChange(async (value) => { this.plugin.settings.autoOptimize = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Billing").setHeading();
    containerEl.createEl("p", { text: `${this.plugin.settings.freeConversionsRemaining} of 3 free successful conversions remain today. Purchased balance: ${this.plugin.settings.purchasedConversions.toLocaleString()} conversion(s).` });
    addBillingAccountSettings(containerEl, { state: this.plugin.settings, appId: "mica-webp-optimizer", installationId: this.plugin.settings.constanceDeviceId, appVersion: this.plugin.manifest.version, persist: () => this.plugin.saveSettings(), syncBalance: () => this.plugin.reconcileBilling(), refresh: () => this.display() });
    new Setting(containerEl).setName("Purchased balance").setDesc("Refreshes the balance associated with this Obsidian install and retries pending credit spends. Scans, previews, skips, and rollback never use credits.").addButton((button) => button.setButtonText("Refresh balance").onClick(async () => { await this.plugin.reconcileBilling(); new Notice("Mica: balance check complete."); this.display(); }));
    for (const pack of MICA_PACKS) {
      const priceId = MICA_PRICE_IDS[pack.key];
      new Setting(containerEl).setName(`$${pack.dollars} conversion pack`).setDesc(`${pack.conversions.toLocaleString()} successfully written WebP conversions · one-time purchase · return here and refresh balance after payment`).addButton((button) => button.setButtonText(`Buy $${pack.dollars}`).setDisabled(isPlaceholderPriceId(priceId)).onClick(() => void openCheckout(this.plugin, pack.key)));
    }

    new Setting(containerEl).setName("Quality").setHeading();
    new Setting(containerEl).setName("Quality mode").setDesc("Lossy is compact. Near-lossless uses the browser's highest WebP quality and is a conservative local fallback.").addDropdown((dropdown) => dropdown.addOption("lossy", "Lossy").addOption("near-lossless", "Near-lossless").setValue(this.plugin.settings.qualityMode).onChange(async (value) => { this.plugin.settings.qualityMode = value as "lossy" | "near-lossless"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Lossy quality").setDesc("1–100. The default 82 is a balanced screenshot setting.").addSlider((slider) => slider.setLimits(1, 100, 1).setValue(this.plugin.settings.quality).setDynamicTooltip().onChange(async (value) => { this.plugin.settings.quality = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Maximum dimension").setDesc("Longest edge in pixels. Use 0 to keep original dimensions.").addText((text) => text.setPlaceholder("0").setValue(String(this.plugin.settings.maxDimension || "")).onChange(async (value) => { const parsed = Number.parseInt(value, 10); this.plugin.settings.maxDimension = Number.isFinite(parsed) && parsed > 0 ? parsed : 0; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Metadata").setHeading();
    new Setting(containerEl).setName("Metadata policy").setDesc(this.plugin.settings.metadataPolicy === "strip" ? "Strip EXIF, device, location, and embedded profile metadata where the encoder supports it. This is the privacy-first default." : "Keep recognized EXIF, ICC, and XMP chunks when the local WebP container accepts them; unsupported metadata is reported.").addDropdown((dropdown) => dropdown.addOption("strip", "Strip unnecessary metadata").addOption("keep", "Keep when supported").setValue(this.plugin.settings.metadataPolicy).onChange(async (value) => { this.plugin.settings.metadataPolicy = value as "strip" | "keep"; await this.plugin.saveSettings(); this.display(); }));

    new Setting(containerEl).setName("Original files").setHeading();
    new Setting(containerEl).setName("After conversion").setDesc("Keep is safest. Backup moves the original into a recoverable vault folder. Review leaves it in place and flags conversions without safe references.").addDropdown((dropdown) => dropdown.addOption("keep", "Keep beside WebP").addOption("backup", "Move to backup folder").addOption("review", "Keep and require review").setValue(this.plugin.settings.originalHandling).onChange(async (value) => { this.plugin.settings.originalHandling = value as "keep" | "backup" | "review"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Backup folder").setDesc("Used when original handling is set to backup.").addText((text) => text.setValue(this.plugin.settings.backupFolder).onChange(async (value) => { const cleaned = value.trim().replace(/^\/|\/$/g, ""); this.plugin.settings.backupFolder = cleaned || ".mica-backups"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Ask when WebP is larger").setDesc("Pause for a per-file choice instead of accepting a larger output.").addToggle((toggle) => toggle.setValue(this.plugin.settings.showLargerFilePrompt).onChange(async (value) => { this.plugin.settings.showLargerFilePrompt = value; await this.plugin.saveSettings(); }));

    new Setting(containerEl).setName("Performance").setHeading();
    new Setting(containerEl).setName("Concurrent conversions").setDesc("1–4 local encodes at once. Note rewrites are still serialized safely.").addSlider((slider) => slider.setLimits(1, 4, 1).setValue(this.plugin.settings.concurrency).setDynamicTooltip().onChange(async (value) => { this.plugin.settings.concurrency = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Review conversion log").setDesc(`${this.plugin.settings.log.length} recent event(s) retained locally.`).addButton((button) => button.setButtonText("Open log").onClick(() => this.plugin.openLog()));
    new Setting(containerEl).setName("Rollback most recent batch").setDesc("Restores note text and backed-up originals when they are still available.").addButton((button) => button.setButtonText("Rollback").setWarning().onClick(() => { void this.plugin.rollbackLastBatch(); }));
    containerEl.createEl("p", { cls: "mica-privacy-note", text: "Privacy: conversion stays local and vault media is never uploaded. The optional billing network is used only for checkout and purchased-balance sync; scans, previews, skips, rollback, and the daily free allowance work without it. See PRIVACY.md for the threat model." });
  }
}
