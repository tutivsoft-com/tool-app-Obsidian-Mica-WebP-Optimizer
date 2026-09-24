export type QualityMode = "lossy" | "near-lossless";
export type MetadataPolicy = "strip" | "keep";
export type OriginalHandling = "keep" | "backup" | "review";
export type MicaPack = "usd_001" | "usd_010";

export interface MicaSettings {
  constanceDeviceId: string;
  billingEmail: string;
  billingAccessToken: string;
  billingRefreshToken: string;
  billingAccessTokenExpiresAt: number;
  billingAccountLinked: boolean;
  freeConversionsRemaining: number;
  freeAllowanceDate: string;
  purchasedConversions: number;
  pendingSpendEvents: Array<{ eventId: string; amount: number }>;
  pendingFreeUsageEvents: Array<{ eventId: string; amount: number }>;
  pendingCheckout: { eventId: string; pack: MicaPack } | null;
  watchedFolders: string[];
  outputFolder: string;
  quality: number;
  qualityMode: QualityMode;
  metadataPolicy: MetadataPolicy;
  maxDimension: number;
  originalHandling: OriginalHandling;
  backupFolder: string;
  concurrency: number;
  autoOptimize: boolean;
  showLargerFilePrompt: boolean;
  reviewBeforeApply: boolean;
  log: ConversionLogEntry[];
  lastBatch: BatchJournal | null;
}

export interface ConversionLogEntry {
  id: string;
  timestamp: string;
  source: string;
  output?: string;
  sourceBytes: number;
  outputBytes?: number;
  qualityMode: QualityMode;
  quality: number;
  result: "converted" | "skipped" | "failed" | "larger-kept-original" | "already-processed" | "review";
  reason?: string;
}

export interface BatchJournalEntry {
  sourcePath: string;
  outputPath?: string;
  backupPath?: string;
  sourceHash: string;
  sourceBytes: number;
  noteChanges: Array<{ path: string; originalContent: string }>;
  originalMoved: boolean;
}

export interface BatchJournal {
  id: string;
  startedAt: string;
  completedAt?: string;
  entries: BatchJournalEntry[];
}

export interface ImageInfo {
  width: number;
  height: number;
  hasAlpha: boolean;
  animated: boolean;
}

export interface ConversionResult {
  bytes: ArrayBuffer;
  info: ImageInfo;
  outputWidth: number;
  outputHeight: number;
  metadataPreserved: boolean;
}

export interface CandidateFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  reason?: string;
}

export interface ScanSummary {
  candidates: CandidateFile[];
  skipped: CandidateFile[];
  totalBytes: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  converted: number;
  skipped: number;
  failed: number;
  current: string;
  paused: boolean;
  cancelled: boolean;
}
