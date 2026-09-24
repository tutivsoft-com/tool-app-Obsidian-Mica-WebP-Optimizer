import type { MicaSettings } from "./types";
import { FREE_CONVERSIONS_PER_DAY } from "./billing-policy";

export const DEFAULT_SETTINGS: MicaSettings = {
  constanceDeviceId: "",
  billingEmail: "",
  billingAccessToken: "",
  billingRefreshToken: "",
  billingAccessTokenExpiresAt: 0,
  billingAccountLinked: false,
  freeConversionsRemaining: FREE_CONVERSIONS_PER_DAY,
  freeAllowanceDate: "",
  purchasedConversions: 0,
  pendingSpendEvents: [],
  pendingFreeUsageEvents: [],
  pendingCheckout: null,
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
  showLargerFilePrompt: false,
  reviewBeforeApply: false,
  log: [],
  lastBatch: null
};

export function normalizeSettings(raw: Partial<MicaSettings> | null | undefined): MicaSettings {
  const value = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  const normalizePendingEvents = (events: unknown): Array<{ eventId: string; amount: number }> => Array.isArray(events)
    ? events.filter((item): item is { eventId: string; amount: number } => Boolean(item) && typeof item === "object" && typeof (item as { eventId?: unknown }).eventId === "string" && Number.isInteger((item as { amount?: unknown }).amount) && Number((item as { amount: number }).amount) > 0)
    : [];
  const pendingCheckout = value.pendingCheckout && (value.pendingCheckout.pack === "usd_001" || value.pendingCheckout.pack === "usd_010") && typeof value.pendingCheckout.eventId === "string"
    ? { eventId: value.pendingCheckout.eventId, pack: value.pendingCheckout.pack }
    : null;
  return {
    ...value,
    constanceDeviceId: typeof value.constanceDeviceId === "string" ? value.constanceDeviceId : "",
    billingEmail: typeof value.billingEmail === "string" ? value.billingEmail : "",
    billingAccessToken: typeof value.billingAccessToken === "string" ? value.billingAccessToken : "",
    billingRefreshToken: typeof value.billingRefreshToken === "string" ? value.billingRefreshToken : "",
    billingAccessTokenExpiresAt: Math.max(0, Number(value.billingAccessTokenExpiresAt) || 0),
    billingAccountLinked: value.billingAccountLinked === true && Boolean(value.billingAccessToken),
    freeConversionsRemaining: Math.max(0, Math.min(FREE_CONVERSIONS_PER_DAY, Math.floor(Number(value.freeConversionsRemaining) || 0))),
    freeAllowanceDate: typeof value.freeAllowanceDate === "string" ? value.freeAllowanceDate : "",
    purchasedConversions: Math.max(0, Math.floor(Number(value.purchasedConversions) || 0)),
    pendingSpendEvents: normalizePendingEvents(value.pendingSpendEvents),
    pendingFreeUsageEvents: normalizePendingEvents(value.pendingFreeUsageEvents),
    pendingCheckout,
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
    showLargerFilePrompt: value.showLargerFilePrompt === true,
    reviewBeforeApply: value.reviewBeforeApply === true,
    log: Array.isArray(value.log) ? value.log.slice(-500) : [],
    lastBatch: value.lastBatch ?? null
  };
}
