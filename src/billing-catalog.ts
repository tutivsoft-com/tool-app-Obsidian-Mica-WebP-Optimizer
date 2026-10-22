import { watchCheckoutProgress } from "./billing-progress";
import { diagnostics } from "./diagnostics";
import { Setting, requestUrl } from "obsidian";
import { refreshBillingSession } from "./constance-account";
import { openAccountCheckout, resumeAccountCheckout, recoverAccountCheckout, cancelAccountCheckout } from "./billing-checkout";
import { CONSTANCE_API, BILLING_UNIT } from "./constance-v2";
export const PAYMENT_VENDORS = { paddle: "Paddle", razorpay: "Razorpay", stripe: "Stripe", paypal: "PayPal", creem: "Creem", kelviq: "Kelviq" } as const;
export type PaymentVendor = keyof typeof PAYMENT_VENDORS;
export function matchingVendorPacks(offers: any[], vendor: string, currency: string): any[] {
  return offers.filter(offer => offer.pack.provider === vendor && offer.pack.currency === currency);
}
interface BillingCatalogHost { appId: string; installationId: string; state: any; persist(): Promise<void>; syncBalance(): Promise<void>; resumeCheckout?(): void }
/** Only server offers granting this app's metered unit can become purchase buttons. */
export function joinPublicPacks(products: any, appId: string): any[] {
  if (products?.app_id !== appId || !Array.isArray(products.offers)) return [];
  return products.offers.filter((offer: any) => offer?.kind === "credits").map((pack: any) => {
    const priceId = typeof pack.code === "string" ? pack.code : "";
    const units = pack.grants?.units, unit = pack.grants?.unit;
    const available = !!priceId && Object.prototype.hasOwnProperty.call(PAYMENT_VENDORS, pack.provider) && unit === BILLING_UNIT && Number.isSafeInteger(units) && units > 0
      && Number.isInteger(pack.currency_exponent) && pack.currency_exponent >= 0 && pack.currency_exponent <= 4
      && Number.isSafeInteger(pack.amount) && pack.amount > 0 && typeof pack.currency === "string" && /^[A-Z]{3}$/.test(pack.currency);
    let amount = "";
    if (available) { try { amount = new Intl.NumberFormat(undefined, { style: "currency", currency: pack.currency }).format(pack.amount / (10 ** pack.currency_exponent)); } catch (_) { /* Invalid currency remains unavailable. */ } }
    return { pack, priceId, units, unit, amount, available: available && !!amount };
  });
}
export function addLivePacks(root: HTMLElement, host: BillingCatalogHost): void {
  const checkoutHost = { ...host, syncBalance: async () => { await host.syncBalance(); }, refreshSession: () => refreshBillingSession(host.state, host.persist) };
  const progress = watchCheckoutProgress(root, host.state);
  resumeAccountCheckout(checkoutHost);
  let recovery: Setting | undefined;
  const showRecovery = () => {
    if (recovery || !host.state.pendingAccountCheckout) return;
    recovery = new Setting(root).setName("Current purchase").setDesc("Cancels an unpaid purchase so you can buy again. Completed purchases stay safe.")
      .addButton(button => button.setButtonText("Check payment").onClick(async () => {
        button.setDisabled(true);
        try { await recoverAccountCheckout(checkoutHost); }
        finally { button.setDisabled(false); }
      }))
      .addButton(button => button.setButtonText("Cancel current purchase").onClick(async () => {
        button.setDisabled(true);
        try { await cancelAccountCheckout(checkoutHost); }
        finally { button.setDisabled(false); }
      }));
  };
  showRecovery();
  let selectedCurrency = "USD";
  let selectedVendor: PaymentVendor = "paddle";
  let renderOffers = () => {};
  const section = root.createDiv({ cls: "ui-billing-packs" });
  new Setting(section).setName("Payment vendor").setDesc("Choose a payment service. Availability is managed by Constance.").addDropdown(dropdown => {
    for (const [value, label] of Object.entries(PAYMENT_VENDORS)) dropdown.addOption(value, label);
    dropdown.setValue(selectedVendor).onChange(value => { selectedVendor = value as PaymentVendor; renderOffers(); });
  });
  new Setting(section).setName("Currency").addDropdown(dropdown => {
    dropdown.addOption("USD", "USD");
    dropdown.addOption("INR", "INR");
    dropdown.setValue("USD").onChange(value => { selectedCurrency = value; renderOffers(); });
  });
  const status = section.createEl("p", { text: "Loading prices..." });
  const packs = section.createDiv();
  void diagnostics.guard("billing-catalog.load", async () => {
    try {
      const response = await requestUrl({ url: `${CONSTANCE_API}/billing/offers?app_id=${encodeURIComponent(host.appId)}`, method: "GET", throw: false });
      if (response.status !== 200) throw new Error("Prices unavailable");
      const catalog = response.json?.data;
      if (catalog?.app_id !== host.appId || !Array.isArray(catalog.offers)) throw new Error("Prices unavailable");
      const offers = joinPublicPacks(catalog, host.appId);
      const unavailable = new Set((catalog.unavailable_providers || []).map((item: any) => item.provider));
      renderOffers = () => {
      packs.empty();
      const matching = matchingVendorPacks(offers, selectedVendor, selectedCurrency);
      status.setText(matching.length ? "Applicable taxes are calculated at checkout." : unavailable.has(selectedVendor)
        ? "This vendor's prices are temporarily unavailable. Choose another vendor or refresh."
        : "No packs available for this vendor and currency.");
      for (const { pack, priceId, units, unit, amount, available } of matching) {
        new Setting(packs).setName(`${pack.name || "Credit offer"}${pack.provider ? ` (${PAYMENT_VENDORS[pack.provider as PaymentVendor] || pack.provider})` : ""}`).setDesc(`${pack.description || ""} ${units?.toLocaleString()} ${unit}. Tax: ${pack.tax_mode || "shown at checkout"}.`).addButton(button => button.setButtonText(available ? `Buy ${amount}` : "Pricing unavailable").setDisabled(!available).onClick(async () => {
          button.setDisabled(true);
          try { const operation = openAccountCheckout(checkoutHost, priceId); progress.refresh(); await operation; } finally { progress.refresh(); button.setDisabled(!available); showRecovery(); }
        }));
      }
      };
      renderOffers();
    } catch (error) { diagnostics.failure("billing-catalog.load", error); status.setText("Pricing temporarily unavailable. Refresh before buying."); }
  });
}
