# Mica WebP Optimizer

Convert supported PNG and JPEG images to WebP locally and update safe note references.

## Use

Install or update Mica through Obsidian Community plugins, enable it, and open its settings. Use **Scan current folder and optimize** to scan the active file's folder or **Scan complete vault and optimize** to scan the vault. In the file explorer, use the Mica context menu to optimize selected images or folders. Existing preferences and local recovery records are retained.

## Account and billing

Connect your Constance account in plugin settings. If you create an account, confirm the email link and then connect again. Authentication, current offers, free allowance, purchased balance and payment confirmation use the Constance v2 service at https://app.tutivsoft.com.

Current paid names, descriptions, prices, currencies and included units come from the payment provider through Constance. Refresh the displayed offers before buying. If current pricing cannot be verified, buying is unavailable. Only canonical payment fulfillment grants credits. A completed purchase stays saved until the refreshed balance is saved and acknowledged. Pending requests retain their original identity after a retry or restart. Account and Buy credits use separate theme-aware sections with standard Obsidian controls. Balance summaries stay with Account. Purchase progress and elapsed time appear directly below the offers. Automatic checks begin after three seconds, then every five seconds for up to five minutes. Check payment and Cancel current purchase are the only purchase-status actions. Completion requires canonical fulfillment, a saved refreshed balance and acknowledgement of the original purchase. A browser return or timer does not grant credits.

Mica retains its configured payment vendors and currencies. Existing historical purchases retain their original provider. No payment credentials are bundled in the plugin.

## Privacy and recovery

Account requests send authentication and billing information to Constance. Passwords are not saved. Session credentials and recovery state are kept in local plugin settings. Billing requests do not contain note or image contents. The main processing workflow stays local. Basic app usage events use the existing analytics service without note contents. Datadog receives automatic startup and plugin error reports. For details on those reports and the copyable diagnostic log, see the [privacy statement](docs/PRIVACY.md).

Uncertain older billing records are retained and are never replayed as new v2 charges. Connect the original account and contact support if an earlier operation needs recovery.

## Release

Version 3.4.86: Rollback preserves newer note and image edits. Automatic conversion retains collision protection, reference updates and refreshed balances.

Obsidian Community release **3.4.86** requires Obsidian **1.5.0** or later. [GitHub release](https://github.com/tutivsoft-com/tool-app-Obsidian-Mica-WebP-Optimizer/releases/tag/3.4.86).

## Support

Open **Help** in Mica settings or run **Open documentation** from the command palette. For a billing problem, retain the original purchase or operation ID and use the account portal. Do not share passwords or session tokens.
