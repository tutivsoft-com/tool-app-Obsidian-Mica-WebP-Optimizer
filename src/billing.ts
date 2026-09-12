import { Notice, requestUrl } from "obsidian";
import type MicaPlugin from "./main";
import { BillingLock, createBillingEventId, isPlaceholderPriceId } from "./billing-policy";

export { isPlaceholderPriceId } from "./billing-policy";

const BASE_URL = "https://app.tutivsoft.com";
export const MICA_APP_ID = "mica-webp-optimizer";
export const MICA_PRICE_IDS = {
  usd_001: "pri_01m28hmw9t7tz51xvqatwe2dp6",
  usd_010: "pri_01m28hmx9n6g7kgdxvxagwd13k"
} as const;
export type MicaPack = keyof typeof MICA_PRICE_IDS;
export const MICA_PACKS: ReadonlyArray<{ key: MicaPack; dollars: number; conversions: number }> = [
  { key: "usd_001", dollars: 1, conversions: 100 },
  { key: "usd_010", dollars: 10, conversions: 1_000 }
];

const billingLocks = new WeakMap<MicaPlugin, BillingLock>();

function billingLock(plugin: MicaPlugin): BillingLock {
  let lock = billingLocks.get(plugin);
  if (!lock) {
    lock = new BillingLock();
    billingLocks.set(plugin, lock);
  }
  return lock;
}

export function withBillingLock<T>(plugin: MicaPlugin, operation: () => Promise<T>): Promise<T> {
  return billingLock(plugin).run(operation);
}

export type SpendResult =
  | { kind: "ok"; balance: number }
  | { kind: "insufficient" }
  | { kind: "error" };

export async function syncPurchasedConversions(plugin: MicaPlugin): Promise<void> {
  await withBillingLock(plugin, async () => {
    if (!plugin.settings.constanceDeviceId) return;
    try {
      const response = await requestUrl({
        url: `${BASE_URL}/api/v1/public/browser/entitlements`,
        method: "POST",
        throw: false,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: MICA_APP_ID, external_customer_id: plugin.settings.constanceDeviceId, machine_id: plugin.settings.constanceDeviceId })
      });
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      const balance = Number(response.json?.data?.credits?.balance);
      if (!Number.isFinite(balance)) throw new Error("The entitlement response did not contain a valid balance.");
      plugin.settings.purchasedConversions = Math.max(0, Math.floor(balance));
      await plugin.saveSettings();
    } catch (error) {
      console.warn("Mica: Constance balance sync failed", error);
    }
  });
}

export async function spendPurchasedConversion(plugin: MicaPlugin, stableEventId = createBillingEventId()): Promise<SpendResult> {
  if (!plugin.settings.constanceDeviceId) return { kind: "error" };
  plugin.settings.pendingSpendEvents = [...plugin.settings.pendingSpendEvents, { eventId: stableEventId, amount: 1 }]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.eventId === item.eventId) === index);
  await plugin.saveSettings();
  try {
    const response = await requestUrl({
      url: `${BASE_URL}/api/v1/public/browser/credits/spend`,
      method: "POST",
      throw: false,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: MICA_APP_ID, external_customer_id: plugin.settings.constanceDeviceId, machine_id: plugin.settings.constanceDeviceId, amount: 1, event_id: stableEventId })
    });
    if (response.status === 402 || response.status === 404) { plugin.settings.pendingSpendEvents = plugin.settings.pendingSpendEvents.filter((item) => item.eventId !== stableEventId); await plugin.saveSettings(); return { kind: "insufficient" }; }
    if (response.status < 200 || response.status >= 300) return { kind: "error" };
    const balance = Number(response.json?.data?.credits?.balance);
    if (!Number.isFinite(balance)) return { kind: "error" };
    plugin.settings.pendingSpendEvents = plugin.settings.pendingSpendEvents.filter((item) => item.eventId !== stableEventId);
    return { kind: "ok", balance: Math.max(0, Math.floor(balance)) };
  } catch (error) {
    console.error("Mica: Constance credit spend failed", error);
    return { kind: "error" };
  }
}

export async function retryPendingSpendEvents(plugin: MicaPlugin): Promise<void> {
  for (const pending of [...(plugin.settings.pendingSpendEvents ?? [])]) {
    const result = await spendPurchasedConversion(plugin, pending.eventId);
    if (result.kind === "error") break;
    if (result.kind === "ok") plugin.settings.purchasedConversions = result.balance;
    else plugin.settings.purchasedConversions = 0;
    plugin.settings.pendingSpendEvents = plugin.settings.pendingSpendEvents.filter((item) => item.eventId !== pending.eventId);
    await plugin.saveSettings();
  }
}

export function openCheckout(plugin: MicaPlugin, pack: MicaPack): void {
  const email = plugin.settings.billingEmail.trim();
  if (!email || !email.includes("@")) { new Notice("Enter a valid billing email in Mica settings first."); return; }
  const priceId = MICA_PRICE_IDS[pack];
  if (isPlaceholderPriceId(priceId)) { new Notice("Mica billing is not available yet because Paddle prices are still being provisioned."); return; }
  const query = new URLSearchParams({ app_id: MICA_APP_ID, price_id: priceId, email, external_customer_id: plugin.settings.constanceDeviceId });
  window.open(`${BASE_URL}/buy?${query.toString()}`, "_blank");
}
