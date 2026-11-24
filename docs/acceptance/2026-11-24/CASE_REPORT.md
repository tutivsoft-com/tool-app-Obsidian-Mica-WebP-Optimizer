# Mica WebP Optimizer 3.4.86 desktop acceptance

Tested on 24 November 2026 in Obsidian 1.15.1 on Windows. The isolated vault contained generated images and Markdown. The tests exercised the installed GitHub release through the desktop UI. A local fixture supplied account, allowance, credit, catalog and checkout responses. Obsidian handled image decoding and encoding, vault writes, reference updates and rollback.

## Release checked

The [GitHub release](https://github.com/tutivsoft-com/tool-app-Obsidian-Mica-WebP-Optimizer/releases/tag/3.4.86) was the latest published release at the time of testing. The version-only tag resolves to [8dbc4c152e9282dea1bd0913827d61dcddb37080](https://github.com/tutivsoft-com/tool-app-Obsidian-Mica-WebP-Optimizer/commit/8dbc4c152e9282dea1bd0913827d61dcddb37080). The three downloaded files matched their published SHA-256 digests, the tagged files and the bytes installed in the isolated vault. Obsidian reported `mica-webp-optimizer` version `3.4.86`.

| Installed release asset | SHA-256 |
| --- | --- |
| `main.js` | `3f6bfb049202200a9a6023f7a6dadcc859bf5c79b4610a908f5bf7d821670a0a` |
| `manifest.json` | `688ef9000e6664f87bd5bee83feb074dd54cadfc94cb08ec19bb356c6e01458f` |
| `styles.css` | `8b3826ed14d933689253c9cd47b6840eca38774a8eaa7f6f77b48e45faf16535` |

## Cases

| ID | Result | Desktop observation |
| --- | --- | --- |
| 01 | Pass | Fresh Simple settings showed the declared defaults. Obsidian registered all ten Mica commands. The plugin settings showed 3.4.86. |
| 02 | Pass with fixture | Invalid text sent no login request. An unregistered address showed the verification state. Forgot password and Resend verification email used their corresponding fixture routes. Connect and Refresh balance loaded the fixture allowance and credits. |
| 03 | Pass | Switched Simple and Advanced modes. Exercised watched and output folders, backup folder, automatic windows, review, both quality modes, 65/82/92/100 quality, original size and all four size limits, both metadata policies, all three original handling choices, and concurrency values 1 through 4. Preferences survived switching settings modes. |
| 04 | Pass | Open documentation, Open plugin settings, Toggle debug logging and Copy diagnostic log ran through the command palette. Settings exercised Help, Debug logging and Copy full log. The copy test inspected the synthetic diagnostic text locally. |
| 05 | Pass | The ribbon opened the folder picker. The current-folder command reviewed five eligible and five skipped files. Cancel preserved the inputs and the credit count. |
| 06 | Defect | One worker wrote and decoded three WebP outputs from PNG, uppercase JPG and nested JPEG inputs. Two corrupt files logged decode failures. APNG, GIF, existing WebP and SVG stayed in place. Wiki embeds and aliases, nested paths and standard image references updated. The release also rewrote literal inline and fenced code, left a Markdown reference definition pointing to the original PNG, and removed the escaped space in a Markdown link destination. Remote and missing links stayed in place. |
| 07 | Defect | Four workers processed five images with 220 ms simulated account response latency. Two wrote verified WebP outputs and used two fixture credits. Three logged that the reservation was no longer writable. |
| 08 | Pass | During conversion, the command palette paused, resumed and cancelled. The progress dialog changed its button to Resume when paused. Original files stayed in place and queued work stopped. The idle Cancel command reported that no optimization was running. |
| 09 | Defect | With the larger-file prompt off, a 583-byte PNG produced a 906-byte WebP and used one fixture credit. With the prompt on, Keep original and dismissing the dialog retained the original and spent no credit. Use WebP retained the original and wrote the larger image for one fixture credit. |
| 10 | Defect | Keep and require review converted a safely referenced image and preserved its original. A same-named image and note in the backup folder stayed untouched. With an unreferenced image, Mica removed its WebP and spent no fixture credit. Its operation stayed in the writing state and blocked a different image with a recovery notice. |
| 11 | Pass | Optimize this image reviewed and converted one chosen PNG. Review folder optimization included the nested fixture and produced WebP for it. |
| 12 | Pass | Selecting two PNGs alongside a WebP produced a two-image Mica context action and a matching review. The unsupported text file offered no single-image action. The whole-vault command opened review and allowed cancellation. |
| 13 | Pass | Backup moved the original into the selected folder. The existing WebP kept its bytes and the new output used a numbered name. Palette rollback kept a newer note edit and left the conversion for retry. After removing the newer edit, the Settings rollback restored the original image bytes and note text, then removed the generated WebP. |
| 14 | Pass | Automatic optimization converted a new watched PNG and left an unwatched copy alone. Show automatic windows was off and no progress dialog opened. |
| 15 | Defect | View conversion log and Settings Open log displayed actual results. Repeating a scan recorded an already-processed skip. The no-change scan replaced the previous one-entry rollback journal with an empty journal. |
| 16 | Pass with fixture | Tested the six vendor choices and USD and INR currency choices. An empty vendor and currency combination showed no packs. The synthetic checkout showed elapsed time. Check payment reported pending status and Cancel current purchase cleared a confirmed cancellation. |
| 17 | Pass | Startup conversion persisted through a plugin disable and enable cycle and produced WebP from an existing image. Automatic optimization remained separately off. |
| 18 | Pass with fixture | Sign out cleared the local account session. Starting another conversion after review requested an account connection and performed no conversion or spend. |
| 19 | Pass | Keep retained a synthetic EXIF marker on a decoded WebP. Strip removed EXIF. Near-lossless with a 1,280-pixel limit placed a 1,280 × 341 WebP in the chosen output folder. |
| 20 | Pass | The progress dialog Pause, Resume and Cancel actions worked. A concurrent whole-vault command showed the busy notice while the first batch ran. |
| 21 | Pass with fixture | Check payment received canonical fixture fulfillment, refreshed and saved the credit balance, and cleared the completed checkout. |
| 22 | Pass | The empty-folder and missing-active-file paths showed distinct notices. Help opened Account from the main and Common problems sections and started current-folder review. The password-reset link click was captured locally with its documented destination. |
| 23 | Pass with fixture | A declined credit reservation preserved the PNG and produced no WebP. An authorized retry wrote a WebP. A synthetic checkout URL opened through the local test hook. Trying a different offer while pending kept the original checkout. Retrying the same offer reused it. Confirmed cancellation cleared it without crediting the account. |
| 24 | Pass with fixture | A catalog failure displayed temporary pricing unavailability and offered no purchase button. |
| 25 | Defect | Cancel active optimization left a larger-output decision open and the batch running. Choosing Keep original then ended the batch without a WebP write or charge. |
| 26 | Pass | The settings footer showed 3.4.86. The account help sections opened and closed. With automatic windows enabled, a disconnected first-use fixture showed one welcome with a working Open account button. Reloading again did not repeat the welcome. |
| 27 | Conditional | Right-clicking the active image did not show the editor action in the standard desktop image view. Dispatching Obsidian's editor-menu event with the image active displayed Optimize images in current folder on a real Obsidian menu. That action opened review. |

## Screenshots

Ten direct Obsidian window captures, 588,825 bytes total. All visible notes, images and account state are synthetic.

| Desktop view | Capture |
| --- | --- |
| Simple settings and account connection | [01 Simple settings](screenshots/01-simple-settings.png) |
| Advanced optimization settings | [02 Advanced settings](screenshots/02-advanced-settings.png) |
| Help and shortcuts | [03 Help](screenshots/03-help.png) |
| Ribbon folder picker | [04 Folder picker](screenshots/04-folder-picker.png) |
| Review with mixed image inputs | [05 Mixed input review](screenshots/05-review-mixed-inputs.png) |
| Paused optimization | [06 Paused conversion](screenshots/06-paused-conversion.png) |
| Conversion result in the generated Markdown note | [07 Converted Markdown](screenshots/07-converted-markdown.png) |
| Larger output decision | [08 Larger file choice](screenshots/08-larger-file-choice.png) |
| Local conversion log | [09 Conversion log](screenshots/09-conversion-log.png) |
| Synthetic checkout in progress | [10 Checkout progress](screenshots/10-checkout-progress.png) |

## External scope

The checkout, account and recovery results cover the client behavior against local responses. Live email delivery, payment authorizations, settlement, refunds and telemetry delivery were outside this run. The Community listing's current release approval is a separate service record. Later source work is outside this release report.
