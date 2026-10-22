import { diagnostics } from "./diagnostics";
import type MicaPlugin from "./main";
import type { MicaPack } from "./types";
import { BillingLock, isPlaceholderPriceId } from "./billing-policy";
import { requestAuthenticatedBilling, refreshBillingSession } from "./constance-account";
import { CONSTANCE_API, accountBalance } from "./constance-v2";
import { openAccountCheckout, resumeAccountCheckout } from "./billing-checkout";
export { isPlaceholderPriceId };
export type { MicaPack };
export const MICA_APP_ID = "mica-webp-optimizer";
const locks = new WeakMap<MicaPlugin, BillingLock>();
export function withBillingLock<T>(plugin: MicaPlugin, operation: () => Promise<T>): Promise<T> {
  if (!locks.has(plugin)) locks.set(plugin, new BillingLock());
  return locks.get(plugin)!.run(operation);
}
export type SpendResult = {kind:"ok";balance:number}|{kind:"insufficient"}|{kind:"error"};
export async function syncPurchasedConversions(plugin: MicaPlugin, strict = false): Promise<void> {
  const host = {state:plugin.settings, appId:MICA_APP_ID, installationId:plugin.settings.constanceDeviceId,
    persist:()=>plugin.saveSettings(), syncBalance:()=>syncPurchasedConversions(plugin, true),
    refreshSession:()=>refreshBillingSession(plugin.settings,()=>plugin.saveSettings())};
  resumeAccountCheckout(host);
  await withBillingLock(plugin, async () => {
    if (!plugin.settings.billingAccountLinked) {if (strict) throw new Error("Connect your account first."); return;}
    try {
      const response = await requestAuthenticatedBilling(plugin.settings,()=>plugin.saveSettings(),{
        url:CONSTANCE_API+"/billing/entitlements/me?app_id="+MICA_APP_ID,method:"GET",throw:false});
      if (response.status!==200) throw new Error("Balance unavailable. Reconnect or try again.");
      const balance=accountBalance(response.json?.data,MICA_APP_ID);
      plugin.settings.freeConversionsRemaining=balance.free_usage.remaining;
      plugin.settings.purchasedConversions=balance.credits.balance;
      await plugin.saveSettings();
      const acknowledgement = await requestAuthenticatedBilling(plugin.settings,()=>plugin.saveSettings(),{
        url:CONSTANCE_API+"/billing/sync",method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({app_id:MICA_APP_ID,revision:balance.revision}),throw:false});
      if(acknowledgement.status!==200 || !Number.isSafeInteger(acknowledgement.json?.data?.recorded_revision) || acknowledgement.json.data.recorded_revision < balance.revision)
        throw new Error("Your balance was saved but its acknowledgement is pending. Refresh again.");
      plugin.refreshBillingSummary?.();
    } catch(error) {diagnostics.failure("billing.balance",error);if(strict)throw error;}
  });
}
/** Keep uncertain v1 spends saved. They must never become new v2 debits. */
export async function spendPurchasedConversion(_plugin:MicaPlugin,_eventId?:string):Promise<SpendResult>{return {kind:"error"};}
export async function retryPendingSpendEvents(_plugin:MicaPlugin):Promise<void>{}
export async function openCheckout(plugin:MicaPlugin,pack:MicaPack):Promise<void>{
  await openAccountCheckout({state:plugin.settings,appId:MICA_APP_ID,installationId:plugin.settings.constanceDeviceId,
    persist:()=>plugin.saveSettings(),syncBalance:()=>syncPurchasedConversions(plugin, true),
    refreshSession:()=>refreshBillingSession(plugin.settings,()=>plugin.saveSettings())},pack==="usd_001"?"starter":"standard");
}
