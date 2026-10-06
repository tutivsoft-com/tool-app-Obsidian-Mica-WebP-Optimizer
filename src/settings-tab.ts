import { diagnostics } from "./diagnostics";
import { renderNativePacks } from "./native-operations";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import type MicaPlugin from "./main";
import { addBillingAccountSettings } from "./constance-account";

export class MicaSettingTab extends PluginSettingTab {
  constructor(app: ConstructorParameters<typeof PluginSettingTab>[0], private readonly plugin: MicaPlugin) { super(app, plugin); }

  display(): void {
return diagnostics.guard("settings-tab.display_1", () => {
const diagnosticAction1 = () => {

    const { containerEl } = this;
    const diagnosticStage2 = diagnostics?.start?.("settings.render.clear") ?? (() => {});
containerEl.empty();
diagnosticStage2();

    const diagnosticStage3 = diagnostics?.start?.("settings.render.help") ?? (() => {});
this.plugin.support.addHelpSetting(containerEl);
diagnosticStage3();

this.plugin.support.addDebugSetting?.(containerEl);


    const diagnosticStage4 = diagnostics?.start?.("settings.render.stage_1") ?? (() => {});
containerEl.createEl("h2", { text: "Mica WebP Optimizer" });
diagnosticStage4();

    const diagnosticStage5 = diagnostics?.start?.("settings.render.stage_2") ?? (() => {});
containerEl.createEl("p", { text: "Mica converts PNG and JPEG images locally. It writes and verifies the WebP before changing a note, and it never deletes originals automatically." });
diagnosticStage5();


    const advanced = this.plugin.settings.settingsMode === "advanced";
    const diagnosticStage6 = diagnostics?.start?.("settings.render.settings_mode") ?? (() => {});
new Setting(containerEl).setName("Settings mode").setDesc("Simple shows everyday controls. Advanced includes detailed behavior and troubleshooting.").addDropdown((dropdown) => dropdown.addOption("simple", "Simple").addOption("advanced", "Advanced — optional").setValue(this.plugin.settings.settingsMode).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_2", async () => {
const diagnosticEnd24 = diagnostics?.start?.("control.settings_mode.onChange") ?? (() => {});
try {
 this.plugin.settings.settingsMode = value === "advanced" ? "advanced" : "simple"; await this.plugin.saveSettings(); this.display();
} catch (diagnosticError24) { diagnostics?.failure?.("control.settings_mode.onChange", diagnosticError24); throw diagnosticError24; } finally { diagnosticEnd24(); }

});
}));
diagnosticStage6();

    const diagnosticStage7 = diagnostics?.start?.("settings.render.watched_folders") ?? (() => {});
new Setting(containerEl).setName("Watched folders").setDesc("One vault-relative folder per line. Leave empty to watch the complete vault.").addTextArea((text) => text.setValue(this.plugin.settings.watchedFolders.join("\n")).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_3", async () => {
const diagnosticEnd25 = diagnostics?.start?.("control.watched_folders.onChange") ?? (() => {});
try {
 this.plugin.settings.watchedFolders = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); await this.plugin.saveSettings();
} catch (diagnosticError25) { diagnostics?.failure?.("control.watched_folders.onChange", diagnosticError25); throw diagnosticError25; } finally { diagnosticEnd25(); }

});
}));
diagnosticStage7();

    const diagnosticStage8 = diagnostics?.start?.("settings.render.output_folder") ?? (() => {});
if (advanced) {
    new Setting(containerEl).setName("Output folder").setDesc("Vault-relative destination. Leave empty to place WebP beside the original.").addText((text) => text.setPlaceholder("Images/WebP").setValue(this.plugin.settings.outputFolder).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_4", async () => {
const diagnosticEnd26 = diagnostics?.start?.("control.output_folder.onChange") ?? (() => {});
try {
 this.plugin.settings.outputFolder = value.trim().replace(/^\/|\/$/g, ""); await this.plugin.saveSettings();
} catch (diagnosticError26) { diagnostics?.failure?.("control.output_folder.onChange", diagnosticError26); throw diagnosticError26; } finally { diagnosticEnd26(); }

});
}));
    }
diagnosticStage8();

    const diagnosticStage9 = diagnostics?.start?.("settings.render.convert_existing_images_at_startup") ?? (() => {});
if (advanced) {
    new Setting(containerEl).setName("Convert existing images at startup").setDesc("Scan the vault and convert eligible images once after Obsidian finishes loading. Off by default.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoConvertImagesAtStart).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_5", async () => {
const diagnosticEnd27 = diagnostics?.start?.("control.convert_existing_images_at_startup.onChange") ?? (() => {});
try {
 this.plugin.settings.autoConvertImagesAtStart = value; this.plugin.settings.automaticConsumptionApproved = value || this.plugin.settings.autoOptimize; await this.plugin.saveSettings();
} catch (diagnosticError27) { diagnostics?.failure?.("control.convert_existing_images_at_startup.onChange", diagnosticError27); throw diagnosticError27; } finally { diagnosticEnd27(); }

});
}));
    }
diagnosticStage9();

    const diagnosticStage10 = diagnostics?.start?.("settings.render.automatic_optimization") ?? (() => {});
new Setting(containerEl).setName("Automatic optimization").setDesc("Convert eligible images in the background. Each successful conversion uses one credit. Off by default.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoOptimize).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_6", async () => {
const diagnosticEnd28 = diagnostics?.start?.("control.automatic_optimization.onChange") ?? (() => {});
try {
 this.plugin.settings.autoOptimize = value; this.plugin.settings.automaticConsumptionApproved = value || this.plugin.settings.autoConvertImagesAtStart; await this.plugin.saveSettings();
} catch (diagnosticError28) { diagnostics?.failure?.("control.automatic_optimization.onChange", diagnosticError28); throw diagnosticError28; } finally { diagnosticEnd28(); }

});
}));
diagnosticStage10();

    const diagnosticStage11 = diagnostics?.start?.("settings.render.review_before_conversion") ?? (() => {});
new Setting(containerEl).setName("Review before conversion").setDesc("Preview eligible images before conversion. Recommended when changing watched folders or quality.").addToggle((toggle) => toggle.setValue(this.plugin.settings.reviewBeforeApply).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_7", async () => {
const diagnosticEnd29 = diagnostics?.start?.("control.review_before_conversion.onChange") ?? (() => {});
try {
 this.plugin.settings.reviewBeforeApply = value; await this.plugin.saveSettings();
} catch (diagnosticError29) { diagnostics?.failure?.("control.review_before_conversion.onChange", diagnosticError29); throw diagnosticError29; } finally { diagnosticEnd29(); }

});
}));
diagnosticStage11();


    const diagnosticStage12 = diagnostics?.start?.("settings.render.billing") ?? (() => {});
new Setting(containerEl).setName("Billing").setHeading();
diagnosticStage12();

    const balanceSummary = containerEl.createEl("p", { cls: "mica-billing-summary", attr: { role: "status", "aria-live": "polite" } });
    const renderBalanceSummary = () => { const diagnosticAction30 = () => (balanceSummary.setText(!this.plugin.settings.billingAccountLinked || !this.plugin.settings.billingAccessToken ? "Create an account or sign in, then Connect to load your free and purchased credits." : `Free conversions remaining: ${this.plugin.settings.freeConversionsRemaining}. Purchased conversions: ${this.plugin.settings.purchasedConversions.toLocaleString()}. Refresh to update your balance.`)); return diagnostics?.run ? diagnostics.run("settings-tab.renderBalanceSummary", diagnosticAction30) : diagnosticAction30(); };
    const diagnosticStage13 = diagnostics?.start?.("settings.render.stage_3") ?? (() => {});
this.plugin.billingSummaryRefresh = renderBalanceSummary;
diagnosticStage13();

    const diagnosticStage14 = diagnostics?.start?.("settings.render.stage_4") ?? (() => {});
renderBalanceSummary();
diagnosticStage14();

    const diagnosticStage15 = diagnostics?.start?.("settings.render.account") ?? (() => {});
addBillingAccountSettings(containerEl, { state: this.plugin.settings, appId: "mica-webp-optimizer", installationId: this.plugin.settings.constanceDeviceId, appVersion: this.plugin.manifest.version, persist: () => this.plugin.saveSettings(), syncBalance: () => this.plugin.reconcileBilling(), refresh: () => this.display() });
diagnosticStage15();

    const diagnosticStage16 = diagnostics?.start?.("settings.render.purchased_balance") ?? (() => {});
new Setting(containerEl).setName("Purchased balance").setDesc("Refreshes your connected account balance and retries pending credit spends. Scans, previews, skips, and rollback never use credits.").addButton((button) => button.setButtonText("Refresh balance").onClick(async () => {
return diagnostics.guard("settings-tab.control_8", async () => {
const diagnosticEnd31 = diagnostics?.start?.("control.purchased_balance.onClick") ?? (() => {});
try {
 button.setDisabled(true); try { await this.plugin.reconcileBilling(true); new Notice("Mica: balance check complete."); this.display(); } catch (caughtError9) {
diagnostics.failure("settings-tab.caught_10", caughtError9); new Notice("Mica: balance could not be refreshed. Check your connection and account, then retry."); } finally { button.setDisabled(false); }
} catch (diagnosticError31) { diagnostics?.failure?.("control.purchased_balance.onClick", diagnosticError31); throw diagnosticError31; } finally { diagnosticEnd31(); }

});
}));
diagnosticStage16();

    const diagnosticStage17 = diagnostics?.start?.("settings.render.catalog") ?? (() => {});
void diagnostics.guard("settings-tab.background_11", () => (renderNativePacks(containerEl,{app:this.app,settings:this.plugin.settings,persistNative:()=>this.plugin.saveSettings()},"mica-webp-optimizer",async plan=>{
const diagnosticEnd32 = diagnostics?.start?.("settings-tab.background.5440") ?? (() => {});
try {
const {openAccountCheckoutByPrice}=await import("./billing-checkout");await openAccountCheckoutByPrice({state:this.plugin.settings,appId:"mica-webp-optimizer",installationId:this.plugin.settings.constanceDeviceId,persist:()=>this.plugin.saveSettings(),syncBalance:()=>this.plugin.reconcileBilling(),refreshSession:async()=>{
const diagnosticEnd33 = diagnostics?.start?.("settings-tab.background.5767") ?? (() => {});
try {
const a=await import("./constance-account");return await (a.refreshBillingSession(this.plugin.settings,()=>this.plugin.saveSettings()));
} catch (diagnosticError33) { diagnostics?.failure?.("settings-tab.background.5767", diagnosticError33); throw diagnosticError33; } finally { diagnosticEnd33(); }
}},plan);
} catch (diagnosticError32) { diagnostics?.failure?.("settings-tab.background.5440", diagnosticError32); throw diagnosticError32; } finally { diagnosticEnd32(); }
})));
diagnosticStage17();


    const diagnosticStage18 = diagnostics?.start?.("settings.render.quality") ?? (() => {});
new Setting(containerEl).setName("Quality").setHeading();
diagnosticStage18();

    const diagnosticStage19 = diagnostics?.start?.("settings.render.quality_mode") ?? (() => {});
if (advanced) {
    new Setting(containerEl).setName("Quality mode").setDesc("Lossy produces smaller files. Near-lossless uses the highest available WebP quality.").addDropdown((dropdown) => dropdown.addOption("lossy", "Lossy").addOption("near-lossless", "Near-lossless").setValue(this.plugin.settings.qualityMode).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_12", async () => {
const diagnosticEnd34 = diagnostics?.start?.("control.quality_mode.onChange") ?? (() => {});
try {
 this.plugin.settings.qualityMode = value as "lossy" | "near-lossless"; await this.plugin.saveSettings();
} catch (diagnosticError34) { diagnostics?.failure?.("control.quality_mode.onChange", diagnosticError34); throw diagnosticError34; } finally { diagnosticEnd34(); }

});
}));
    }
diagnosticStage19();

    const diagnosticStage20 = diagnostics?.start?.("settings.render.lossy_quality") ?? (() => {});
new Setting(containerEl).setName("Lossy quality").setDesc("1–100. The default 82 is a balanced screenshot setting.").addDropdown((dropdown) => dropdown.addOption("65", "65 — smaller files").addOption("82", "82 — balanced (recommended)").addOption("92", "92 — more detail").addOption("100", "100 — highest quality").addOptions([65, 82, 92, 100].includes(this.plugin.settings.quality) ? {} : { [String(this.plugin.settings.quality)]: `${this.plugin.settings.quality} — current quality` }).setValue(String(this.plugin.settings.quality)).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_13", async () => {
const diagnosticEnd35 = diagnostics?.start?.("control.lossy_quality.onChange") ?? (() => {});
try {
 this.plugin.settings.quality = Number(value); await this.plugin.saveSettings();
} catch (diagnosticError35) { diagnostics?.failure?.("control.lossy_quality.onChange", diagnosticError35); throw diagnosticError35; } finally { diagnosticEnd35(); }

});
}));
diagnosticStage20();

    const diagnosticStage21 = diagnostics?.start?.("settings.render.maximum_dimension") ?? (() => {});
if (advanced) {
    new Setting(containerEl).setName("Maximum dimension").setDesc("Longest edge in pixels. Keep original is recommended unless you need smaller images.").addDropdown((dropdown) => dropdown.addOptions({ [String(this.plugin.settings.maxDimension)]: `${this.plugin.settings.maxDimension || "Original"} · current`, "0": "Keep original (recommended)", "1280": "1,280 pixels · compact", "1920": "1,920 pixels · full HD", "2560": "2,560 pixels · detailed", "4096": "4,096 pixels · high resolution" }).setValue(String(this.plugin.settings.maxDimension)).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_14", async () => {
const diagnosticEnd36 = diagnostics?.start?.("control.maximum_dimension.onChange") ?? (() => {});
try {
 this.plugin.settings.maxDimension = Number(value); await this.plugin.saveSettings();
} catch (diagnosticError36) { diagnostics?.failure?.("control.maximum_dimension.onChange", diagnosticError36); throw diagnosticError36; } finally { diagnosticEnd36(); }

});
}));
    }
diagnosticStage21();


    const diagnosticStage22 = diagnostics?.start?.("settings.render.metadata") ?? (() => {});
if (advanced) {
    this.plugin.support.addDiagnosticsSetting(containerEl);
    new Setting(containerEl).setName("Metadata").setHeading();
    new Setting(containerEl).setName("Metadata policy").setDesc(this.plugin.settings.metadataPolicy === "strip" ? "Strip EXIF, device, location, and embedded profile metadata where the encoder supports it. This is the privacy-first default." : "Keep recognized EXIF, ICC, and XMP chunks when the local WebP container accepts them; unsupported metadata is reported.").addDropdown((dropdown) => dropdown.addOption("strip", "Strip unnecessary metadata").addOption("keep", "Keep when supported").setValue(this.plugin.settings.metadataPolicy).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_15", async () => {
const diagnosticEnd37 = diagnostics?.start?.("control.metadata_policy.onChange") ?? (() => {});
try {
 this.plugin.settings.metadataPolicy = value as "strip" | "keep"; await this.plugin.saveSettings(); this.display();
} catch (diagnosticError37) { diagnostics?.failure?.("control.metadata_policy.onChange", diagnosticError37); throw diagnosticError37; } finally { diagnosticEnd37(); }

});
}));

    new Setting(containerEl).setName("Original files").setHeading();
    new Setting(containerEl).setName("After conversion").setDesc("Keep is safest. Backup moves the original into a recoverable vault folder. Review leaves it in place and flags conversions without safe references.").addDropdown((dropdown) => dropdown.addOption("keep", "Keep beside WebP").addOption("backup", "Move to backup folder").addOption("review", "Keep and require review").setValue(this.plugin.settings.originalHandling).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_16", async () => {
const diagnosticEnd38 = diagnostics?.start?.("control.after_conversion.onChange") ?? (() => {});
try {
 this.plugin.settings.originalHandling = value as "keep" | "backup" | "review"; await this.plugin.saveSettings();
} catch (diagnosticError38) { diagnostics?.failure?.("control.after_conversion.onChange", diagnosticError38); throw diagnosticError38; } finally { diagnosticEnd38(); }

});
}));
    new Setting(containerEl).setName("Backup folder").setDesc("Used with Move to backup folder. Default: .mica-backups; originals stay available for rollback.").addText((text) => text.setValue(this.plugin.settings.backupFolder).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_17", async () => {
const diagnosticEnd39 = diagnostics?.start?.("control.backup_folder.onChange") ?? (() => {});
try {
 const cleaned = value.trim().replace(/^\/|\/$/g, ""); this.plugin.settings.backupFolder = cleaned || ".mica-backups"; await this.plugin.saveSettings();
} catch (diagnosticError39) { diagnostics?.failure?.("control.backup_folder.onChange", diagnosticError39); throw diagnosticError39; } finally { diagnosticEnd39(); }

});
}));
    new Setting(containerEl).setName("Ask when WebP is larger").setDesc("Ask before keeping a WebP larger than its source. Otherwise Mica keeps the original and skips the larger output.").addToggle((toggle) => toggle.setValue(this.plugin.settings.showLargerFilePrompt).onChange(async (value) => {
return diagnostics.guard("settings-tab.control_18", async () => {
const diagnosticEnd40 = diagnostics?.start?.("control.ask_when_webp_is_larger.onChange") ?? (() => {});
try {
 this.plugin.settings.showLargerFilePrompt = value; await this.plugin.saveSettings();
} catch (diagnosticError40) { diagnostics?.failure?.("control.ask_when_webp_is_larger.onChange", diagnosticError40); throw diagnosticError40; } finally { diagnosticEnd40(); }

});
}));

    new Setting(containerEl).setName("Performance").setHeading();
    new Setting(containerEl).setName("Concurrent conversions").setDesc("Convert one to four images at a time. Default: two. Choose one on devices with limited memory.").addSlider((slider) => slider.setLimits(1, 4, 1).setValue(this.plugin.settings.concurrency).setDynamicTooltip().onChange(async (value) => {
return diagnostics.guard("settings-tab.control_19", async () => {
const diagnosticEnd41 = diagnostics?.start?.("control.concurrent_conversions.onChange") ?? (() => {});
try {
 this.plugin.settings.concurrency = value; await this.plugin.saveSettings();
} catch (diagnosticError41) { diagnostics?.failure?.("control.concurrent_conversions.onChange", diagnosticError41); throw diagnosticError41; } finally { diagnosticEnd41(); }

});
}));
    new Setting(containerEl).setName("Review conversion log").setDesc(`${this.plugin.settings.log.length} recent event(s) retained locally.`).addButton((button) => button.setButtonText("Open log").onClick(() => {
return diagnostics.guard("settings-tab.control_20", () => { const diagnosticAction42 = () => (this.plugin.openLog()); return diagnostics?.run ? diagnostics.run("control.review_conversion_log.onClick", diagnosticAction42) : diagnosticAction42();
});
}));
    new Setting(containerEl).setName("Rollback most recent batch").setDesc("Restores note text and backed-up originals when they are still available.").addButton((button) => button.setButtonText("Rollback").setWarning().onClick(() => {
return diagnostics.guard("settings-tab.control_21", () => {
const diagnosticAction43 = () => {
 void diagnostics.guard("settings-tab.background_22", () => (this.plugin.rollbackLastBatch()));
}; return diagnostics?.run ? diagnostics.run("control.rollback_most_recent_batch.onClick", diagnosticAction43) : diagnosticAction43();

});
}));
    }
diagnosticStage22();

    const diagnosticStage23 = diagnostics?.start?.("settings.render.stage_5") ?? (() => {});
containerEl.createEl("p", { cls: "mica-privacy-note", text: "Images are converted on your device and are never uploaded. Account requests verify your available credits. Scans, previews, skipped files, and rollback are free." });
diagnosticStage23();


}; return diagnostics?.run ? diagnostics.run("settings.open", diagnosticAction1) : diagnosticAction1();

});
}

  hide(): void { const end = diagnostics?.start?.("settings.close") ?? (() => {}); try { super.hide(); } finally { end(); } }
}
