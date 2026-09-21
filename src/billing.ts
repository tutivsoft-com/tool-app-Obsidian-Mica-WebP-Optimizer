import { Notice, requestUrl } from "obsidian";
import type MicaPlugin from "./main";
import { BillingLock, createBillingEventId, isPlaceholderPriceId } from "./billing-policy";
import { refreshBillingSession, spendAccountCredits } from "./constance-account";
import type { MicaPack } from "./types";

export { isPlaceholderPriceId } from "./billing-policy";

const BASE_URL = "https://app.tutivsoft.com";
export const MICA_APP_ID = "mica-webp-optimizer";
export const MICA_PRICE_IDS = {
  usd_001: "pri_01m28hmw9t7tz51xvqatwe2dp6",
  usd_010: "pri_01m28hmx9n6g7kgdxvxagwd13k"
} as const;
export type { MicaPack } from "./types";
export const MICA_PACKS: ReadonlyArray<{ key: MicaPack; dollars: number; conversions: number }> = [
  { key: "usd_001", dollars: 1, conversions: 100 },
  { key: "usd_010", dollars: 10, conversions: 1_000 }
];
const MICA_PLAN_CODES: Record<MicaPack, string> = {
  usd_001: "one_time",
  usd_010: "standard",
};

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
    if (!plugin.settings.constanceDeviceId || !plugin.settings.billingAccessToken || !plugin.settings.billingAccountLinked) return;
    try {
      if (plugin.settings.billingRefreshToken && plugin.settings.billingAccessTokenExpiresAt > 0 && plugin.settings.billingAccessTokenExpiresAt <= Date.now() + 30_000) await refreshBillingSession(plugin.settings, () => plugin.saveSettings());
      const entitlementRequest = () => requestUrl({
          url: `${BASE_URL}/api/v1/billing/entitlements/me?${new URLSearchParams({ app_id: MICA_APP_ID, installation_id: plugin.settings.constanceDeviceId }).toString()}`,
          method: "GET",
          throw: false,
          headers: { Authorization: `Bearer ${plugin.settings.billingAccessToken}` },
        });
      let response = await entitlementRequest();
      if (response.status === 401 && await refreshBillingSession(plugin.settings, () => plugin.saveSettings())) response = await entitlementRequest();
      if (response.status === 401 || response.status === 403 || response.status === 404) { plugin.settings.billingAccessToken = ""; plugin.settings.billingRefreshToken = ""; plugin.settings.billingAccessTokenExpiresAt = 0; plugin.settings.billingAccountLinked = false; await plugin.saveSettings(); return; }
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
    const result = await spendAccountCredits(plugin.settings, MICA_APP_ID, plugin.settings.constanceDeviceId, stableEventId, 1, () => plugin.saveSettings());
    if (result.kind === "auth-required") { plugin.settings.billingAccessToken = ""; plugin.settings.billingRefreshToken = ""; plugin.settings.billingAccessTokenExpiresAt = 0; plugin.settings.billingAccountLinked = false; await plugin.saveSettings(); return { kind: "error" }; }
    if (result.kind === "insufficient") { plugin.settings.pendingSpendEvents = plugin.settings.pendingSpendEvents.filter((item) => item.eventId !== stableEventId); await plugin.saveSettings(); return { kind: "insufficient" }; }
    if (result.kind === "error") return { kind: "error" };
    const balance = Number(result.balance);
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

export async function openCheckout(plugin: MicaPlugin, pack: MicaPack): Promise<void> {
  if (!plugin.settings.billingAccessToken || !plugin.settings.billingAccountLinked) { new Notice("Sign in or create a billing account in Mica settings before buying conversions."); return; }
  const email = plugin.settings.billingEmail.trim();
  if (!email || !email.includes("@") || !plugin.settings.constanceDeviceId) { new Notice("Complete billing account setup in Mica settings first."); return; }
  const priceId = MICA_PRICE_IDS[pack];
  if (isPlaceholderPriceId(priceId)) { new Notice("Mica billing is not available yet because Paddle prices are still being provisioned."); return; }
  const pending = plugin.settings.pendingCheckout?.pack === pack
    ? plugin.settings.pendingCheckout
    : { eventId: `checkout_${createBillingEventId()}`, pack };
  plugin.settings.pendingCheckout = pending;
  await plugin.saveSettings();
  try {
    const response = await requestUrl({
      url: `${BASE_URL}/api/v1/billing/checkout`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${plugin.settings.billingAccessToken}`,
        "Idempotency-Key": pending.eventId,
      },
      body: JSON.stringify({
        app_id: MICA_APP_ID,
        plan_code: MICA_PLAN_CODES[pack],
        installation_id: plugin.settings.constanceDeviceId,
        quantity: 1,
        coupon_code: null,
      }),
      throw: false,
    });
    if (response.status === 401 || response.status === 403) {
      plugin.settings.billingAccessToken = "";
      plugin.settings.billingRefreshToken = "";
      plugin.settings.billingAccessTokenExpiresAt = 0;
      plugin.settings.billingAccountLinked = false;
      await plugin.saveSettings();
      new Notice("Mica: your billing session expired. Sign in again in plugin settings.");
      return;
    }
    const checkoutUrl = String(response.json?.data?.checkout_url || "");
    if (response.status >= 200 && response.status < 300 && checkoutUrl) {
      plugin.settings.pendingCheckout = null;
      await plugin.saveSettings();
      window.open(checkoutUrl, "_blank");
      new Notice("Checkout opened. Return to Mica and refresh Purchased balance after payment is complete.");
      return;
    }
  } catch (error) {
    console.error("Mica authenticated checkout request failed", error);
    new Notice("Mica: checkout status is unknown. Retry the same purchase to safely resume it.");
    return;
  }

  const query = new URLSearchParams({ app_id: MICA_APP_ID, price_id: priceId, email, external_customer_id: plugin.settings.constanceDeviceId });
  plugin.settings.pendingCheckout = null;
  await plugin.saveSettings();
  window.open(`${BASE_URL}/buy?${query.toString()}`, "_blank");
  new Notice("Checkout opened using the compatibility fallback. Return to Mica and refresh Purchased balance after payment is complete.");
}
