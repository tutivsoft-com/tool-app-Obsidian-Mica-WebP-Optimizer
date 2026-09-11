export const FREE_CONVERSIONS_PER_DAY = 3;

export function localCalendarDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPlaceholderPriceId(priceId: string | undefined): boolean {
  return !priceId || priceId === "PENDING_PROVISIONING" || priceId.startsWith("PENDING_");
}

export function createBillingEventId(randomSource: { getRandomValues<T extends ArrayBufferView>(array: T): T } = globalThis.crypto): string {
  const bytes = new Uint8Array(16);
  randomSource.getRandomValues(bytes);
  return `evt_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export class BillingLock {
  private tail: Promise<void> = Promise.resolve();

  async run<T>(operation: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}
