import { resumeAccountCheckout } from "./billing-checkout";
import { openAccountCheckout } from "./billing-checkout";
import { Notice, requestUrl } from "obsidian";
import type MicaPlugin from "./main";
import { BillingLock, createBillingEventId, isPlaceholderPriceId } from "./billing-policy";
import { refreshBillingSession, spendAccountCredits } from "./constance-account";
import type { MicaPack } from "./types";

export { isPlaceholderPriceId } from "./billing-policy";

const BASE_URL = "https://app.tutivsoft.com";
export const MICA_APP_ID = "mica-webp-optimizer";
export type { MicaPack } from "./types";
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

export async function syncPurchasedConversions(plugin: MicaPlugin, strict = false): Promise<void> {
  resumeAccountCheckout({ state: plugin.settings, appId: MICA_APP_ID, installationId: plugin.settings.constanceDeviceId,
    persist: () => plugin.saveSettings(), syncBalance: () => syncPurchasedConversions(plugin), refreshSession: () => refreshBillingSession(plugin.settings, () => plugin.saveSettings()) });

  await withBillingLock(plugin, async () => {
    if (!plugin.settings.constanceDeviceId || !plugin.settings.billingAccessToken || !plugin.settings.billingAccountLinked) { if (strict) throw new Error("Connect your account before refreshing."); return; }
    try {
      if (plugin.settings.billingRefreshToken && plugin.settings.billingAccessTokenExpiresAt > 0 && plugin.settings.billingAccessTokenExpiresAt <= Date.now() + 30_000) await refreshBillingSession(plugin.settings, () => plugin.saveSettings());
      const entitlementRequest = () => requestUrl({
          url: `${BASE_URL}/api/v1/billing/entitlements/me?${new URLSearchParams({ app_id: MICA_APP_ID, installation_id: plugin.settings.constanceDeviceId }).toString()}`,
          method: "GET",
          throw: false,
          headers: { Authorization: `Bearer ${plugin.settings.billingAccessToken}` },
        });
      let response = await entitlementRequest();
      if (response.status === 401) {
        if (await refreshBillingSession(plugin.settings, () => plugin.saveSettings())) response = await entitlementRequest();
        else if (plugin.settings.billingRefreshToken) throw new Error("Account refresh is temporarily unavailable.");
      }
      if (response.status === 401 || response.status === 403 || response.status === 404) { plugin.settings.billingAccessToken = ""; plugin.settings.billingRefreshToken = ""; plugin.settings.billingAccessTokenExpiresAt = 0; plugin.settings.billingAccountLinked = false; await plugin.saveSettings(); if (strict) throw new Error("Reconnect your billing account."); return; }
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      const balance = Number(response.json?.data?.credits?.balance);
      if (!Number.isFinite(balance)) throw new Error("The entitlement response did not contain a valid balance.");
      plugin.settings.purchasedConversions = Math.max(0, Math.floor(balance));
      await plugin.saveSettings();
      plugin.refreshBillingSummary?.();
    } catch (error) {
      console.warn("Mica: Constance balance sync failed", error);
      if (strict) throw error;
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
  await openAccountCheckout({
    state: plugin.settings, appId: MICA_APP_ID, installationId: plugin.settings.constanceDeviceId,
    persist: () => plugin.saveSettings(), syncBalance: () => syncPurchasedConversions(plugin), refreshSession: () => refreshBillingSession(plugin.settings, () => plugin.saveSettings()),
  }, MICA_PLAN_CODES[pack]);
}
