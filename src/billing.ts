import { diagnostics } from "./diagnostics";
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
const diagnosticEnd1 = diagnostics?.start?.("billing.syncPurchasedConversions") ?? (() => {});
try {

  resumeAccountCheckout({ state: plugin.settings, appId: MICA_APP_ID, installationId: plugin.settings.constanceDeviceId,
    persist: () => plugin.saveSettings(), syncBalance: () => syncPurchasedConversions(plugin), refreshSession: () => refreshBillingSession(plugin.settings, () => plugin.saveSettings()) });

  await withBillingLock(plugin, async () => {
const diagnosticEnd2 = diagnostics?.start?.("billing.background.1680") ?? (() => {});
try {

    if (!plugin.settings.constanceDeviceId || !plugin.settings.billingAccessToken || !plugin.settings.billingAccountLinked) { if (strict) throw new Error("Connect your account before refreshing."); return; }
    try {
      if (plugin.settings.billingRefreshToken && plugin.settings.billingAccessTokenExpiresAt > 0 && plugin.settings.billingAccessTokenExpiresAt <= Date.now() + 30_000) await refreshBillingSession(plugin.settings, () => plugin.saveSettings());
      const entitlementRequest = () => (diagnostics?.request?.("network.billing.syncPurchasedConversions", requestUrl, {
          url: `${BASE_URL}/api/v1/billing/entitlements/me?${new URLSearchParams({ app_id: MICA_APP_ID, installation_id: plugin.settings.constanceDeviceId }).toString()}`,
          method: "GET",
          throw: false,
          headers: { Authorization: `Bearer ${plugin.settings.billingAccessToken}` },
        }) ?? requestUrl({
          url: `${BASE_URL}/api/v1/billing/entitlements/me?${new URLSearchParams({ app_id: MICA_APP_ID, installation_id: plugin.settings.constanceDeviceId }).toString()}`,
          method: "GET",
          throw: false,
          headers: { Authorization: `Bearer ${plugin.settings.billingAccessToken}` },
        }));
      let response = await entitlementRequest();
      if (response.status === 401) {
        if (await refreshBillingSession(plugin.settings, () => plugin.saveSettings())) response = await entitlementRequest();
        else if (plugin.settings.billingRefreshToken) throw new Error("Account refresh is temporarily unavailable.");
      }
      if (response.status === 401 || response.status === 403 || response.status === 404) { plugin.settings.billingAccessToken = ""; plugin.settings.billingRefreshToken = ""; plugin.settings.billingAccessTokenExpiresAt = 0; plugin.settings.billingAccountLinked = false; await plugin.saveSettings(); if (strict) throw new Error("Reconnect your account."); return; }
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      const balance = Number(response.json?.data?.credits?.total_available ?? response.json?.data?.credits?.balance);
      const free = response.json?.data?.free_usage?.remaining;
      if (!Number.isFinite(free) || free < 0) throw new Error("Your balance could not be updated. Refresh it and try again.");
      if (response.json?.data?.credits == null || (response.json.data.credits.total_available ?? response.json.data.credits.balance) == null || String(response.json.data.credits.total_available ?? response.json.data.credits.balance).trim() === "" || !Number.isFinite(balance) || balance < 0) throw new Error("Your balance could not be updated. Refresh it and try again.");
      plugin.settings.freeConversionsRemaining = Math.floor(free);
      plugin.settings.purchasedConversions = Math.max(0, Math.floor(balance));
      await plugin.saveSettings();
      plugin.refreshBillingSummary?.();
    } catch (error) {
diagnostics.failure("billing.caught_extra_1", error);
      diagnostics?.legacy?.("warn", "billing.mica_constance_balance_sync_failed");
      if (strict) throw error;
    }

} catch (diagnosticError2) { diagnostics?.failure?.("billing.background.1680", diagnosticError2); throw diagnosticError2; } finally { diagnosticEnd2(); }
});

} catch (diagnosticError1) { diagnostics?.failure?.("billing.syncPurchasedConversions", diagnosticError1); throw diagnosticError1; } finally { diagnosticEnd1(); }
}

export async function spendPurchasedConversion(plugin: MicaPlugin, stableEventId = createBillingEventId()): Promise<SpendResult> {
const diagnosticEnd3 = diagnostics?.start?.("billing.spendPurchasedConversion") ?? (() => {});
try {

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
diagnostics.failure("billing.caught_extra_2", error);
    diagnostics?.legacy?.("error", "billing.mica_constance_credit_spend_failed");
    return { kind: "error" };
  }

} catch (diagnosticError3) { diagnostics?.failure?.("billing.spendPurchasedConversion", diagnosticError3); throw diagnosticError3; } finally { diagnosticEnd3(); }
}

export async function retryPendingSpendEvents(plugin: MicaPlugin): Promise<void> {
const diagnosticEnd4 = diagnostics?.start?.("billing.retryPendingSpendEvents") ?? (() => {});
try {

  for (const pending of [...(plugin.settings.pendingSpendEvents ?? [])]) {
    const result = await spendPurchasedConversion(plugin, pending.eventId);
    if (result.kind === "error") break;
    if (result.kind === "ok") plugin.settings.purchasedConversions = result.balance;
    else plugin.settings.purchasedConversions = 0;
    plugin.settings.pendingSpendEvents = plugin.settings.pendingSpendEvents.filter((item) => item.eventId !== pending.eventId);
    await plugin.saveSettings();
  }

} catch (diagnosticError4) { diagnostics?.failure?.("billing.retryPendingSpendEvents", diagnosticError4); throw diagnosticError4; } finally { diagnosticEnd4(); }
}

export async function openCheckout(plugin: MicaPlugin, pack: MicaPack): Promise<void> {
const diagnosticEnd5 = diagnostics?.start?.("billing.openCheckout") ?? (() => {});
try {

  await openAccountCheckout({
    state: plugin.settings, appId: MICA_APP_ID, installationId: plugin.settings.constanceDeviceId,
    persist: () => plugin.saveSettings(), syncBalance: () => syncPurchasedConversions(plugin), refreshSession: () => refreshBillingSession(plugin.settings, () => plugin.saveSettings()),
  }, MICA_PLAN_CODES[pack]);

} catch (diagnosticError5) { diagnostics?.failure?.("billing.openCheckout", diagnosticError5); throw diagnosticError5; } finally { diagnosticEnd5(); }
}
