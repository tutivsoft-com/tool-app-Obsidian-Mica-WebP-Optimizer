import type { MicaSettings } from "./types";
import { FREE_CONVERSIONS_PER_DAY } from "./billing-policy";

export const DEFAULT_SETTINGS: MicaSettings = {
  constanceDeviceId: "",
  billingEmail: "",
  billingAccessToken: "",
  billingAccountLinked: false,
  freeConversionsRemaining: FREE_CONVERSIONS_PER_DAY,
  freeAllowanceDate: "",
  purchasedConversions: 0,
  pendingSpendEvents: [],
  watchedFolders: [],
  outputFolder: "",
  quality: 82,
  qualityMode: "lossy",
  metadataPolicy: "strip",
  maxDimension: 0,
  originalHandling: "keep",
  backupFolder: ".mica-backups",
  concurrency: 2,
  autoOptimize: true,
  showLargerFilePrompt: true,
  log: [],
  lastBatch: null
};

export function normalizeSettings(raw: Partial<MicaSettings> | null | undefined): MicaSettings {
  const value = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  return {
    ...value,
    constanceDeviceId: typeof value.constanceDeviceId === "string" ? value.constanceDeviceId : "",
    billingEmail: typeof value.billingEmail === "string" ? value.billingEmail : "",
    billingAccessToken: typeof value.billingAccessToken === "string" ? value.billingAccessToken : "",
    billingAccountLinked: value.billingAccountLinked === true && Boolean(value.billingAccessToken),
    freeConversionsRemaining: Math.max(0, Math.min(FREE_CONVERSIONS_PER_DAY, Math.floor(Number(value.freeConversionsRemaining) || 0))),
    freeAllowanceDate: typeof value.freeAllowanceDate === "string" ? value.freeAllowanceDate : "",
    purchasedConversions: Math.max(0, Math.floor(Number(value.purchasedConversions) || 0)),
    pendingSpendEvents: Array.isArray(value.pendingSpendEvents) ? value.pendingSpendEvents.filter((item) => item && typeof item.eventId === "string" && Number.isInteger(item.amount) && item.amount > 0) : [],
    watchedFolders: Array.isArray(value.watchedFolders) ? value.watchedFolders.filter(Boolean).map((x) => x.trim().replace(/^\/|\/$/g, "")) : [],
    outputFolder: typeof value.outputFolder === "string" ? value.outputFolder.trim().replace(/^\/|\/$/g, "") : "",
    quality: Math.max(1, Math.min(100, Number(value.quality) || DEFAULT_SETTINGS.quality)),
    qualityMode: value.qualityMode === "near-lossless" ? "near-lossless" : "lossy",
    metadataPolicy: value.metadataPolicy === "keep" ? "keep" : "strip",
    maxDimension: Math.max(0, Math.floor(Number(value.maxDimension) || 0)),
    originalHandling: value.originalHandling === "backup" || value.originalHandling === "review" ? value.originalHandling : "keep",
    backupFolder: typeof value.backupFolder === "string" && value.backupFolder.trim() ? value.backupFolder.trim().replace(/^\/|\/$/g, "") : DEFAULT_SETTINGS.backupFolder,
    concurrency: Math.max(1, Math.min(4, Math.floor(Number(value.concurrency) || DEFAULT_SETTINGS.concurrency))),
    autoOptimize: value.autoOptimize !== false,
    showLargerFilePrompt: value.showLargerFilePrompt !== false,
    log: Array.isArray(value.log) ? value.log.slice(-500) : [],
    lastBatch: value.lastBatch ?? null
  };
}
