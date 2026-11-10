# ZecLearn — verified Zcash facts (as of 2026-11-10)

Maintained by the CONTENT agent. Every bullet has a source and the date it was checked.
Primary sources preferred (zips.z.cash, z.cash, zfnd.org, zodl.com, shieldedlabs.net, official forum posts).
Where only secondary press confirms something, that is said explicitly.
**If a fact is not in this file, do not state it in the product.**

---

## 1. Headline answers

### Is "the Orchard pool closed"? — Partly true; say it precisely.
- **Orchard is sealed / closed to inflows, not frozen.** Since NU6.3 ("Ironwood") activated at mainnet block **3,428,143 on 2026-07-28**, no new value may enter the Orchard pool (`valueBalanceOrchard` must be non-negative; the pool "can only be spent from (not added to)"), coinbase may not pay into Orchard, and ordinary Orchard-to-Orchard payments are disabled (cross-address transfers off; change still allowed). Value **may still leave** Orchard, including into the new Ironwood pool. — https://zips.z.cash/zip-0258 (Final), https://zips.z.cash/zip-0318 — checked 2026-11-10
- In practice funds leave Orchard through the **turnstile** into Ironwood (or to a transparent address); addresses don't change because Ironwood reuses Orchard receivers. — https://forum.zcashcommunity.com/t/ironwood-is-here-updated-wallets-libraries-aug-20/56557 (official ecosystem wallet-status thread, updated 2026-08-20) — checked 2026-11-10
- Shielded Labs wording: Ironwood "creates a new shielded pool using the corrected Orchard circuit and seals the original Orchard pool"; after activation users cannot send or receive ZEC *in* the Orchard pool; Orchard funds "will eventually need to migrate to Ironwood". — https://shieldedlabs.net/ironwood/ — checked 2026-11-10
- Shielded Labs, for wallet users: "Until your wallet supports this migration, your Orchard funds may be temporarily unavailable." — https://shieldedlabs.net/ironwood/ — checked 2026-11-10
- ZODL wording: "Orchard will be closed to new deposits and internal transactions, so its funds can only move forward through the turnstile." — https://zodl.com/ironwood-a-new-shielded-pool-for-zcash/ (2026-06-06) — checked 2026-11-10
- No primary source sets a deadline after which Orchard funds become unspendable (ZIP 318 states none). **Do not say Orchard funds are frozen or lost.**
- **Correct product wording:** "Orchard is closed to new deposits (sealed) since NU6.3 in July 2026; funds already in it can still be moved out, into the new Ironwood pool."

### Ironwood is real.
- **Ironwood** is a new shielded pool created at NU6.3 activation (block 3,428,143, 2026-07-28). It uses the corrected Orchard circuit / Halo 2 proofs, has its own chain value pool balance and note commitment tree, and output notes use the quantum-recoverable plaintext format (ZIP 2005, Final). — https://zips.z.cash/zip-0258, https://shieldedlabs.net/ironwood/ — checked 2026-11-10
- NU6.3 ZIPs: 229 (v6 transaction format), 2005 (Ironwood quantum recoverability), 2006 (restricting transfers into Orchard), plus updates to 209, 213, 221, 317; wallet ZIPs 318 (Orchard→Ironwood migration, Draft) and 326 (NU6.3 consequences for wallets). Branch ID 0x37A5165B. — https://zips.z.cash/zip-0258 — checked 2026-11-10
- Ironwood was built by Project Tachyon, Valar Group, ZODL, Zcash Foundation (Zebra implementation) and Shielded Labs; the Ironwood circuit was formally verified. — https://shieldedlabs.net/ironwood/ — checked 2026-11-10
- **Turnstile**: the public accounting of value per pool (ZIP 209) that rejects any attempt to take more ZEC out of a pool than went in; the Orchard→Ironwood exit makes circulating supply auditable. — https://zodl.com/ironwood-a-new-shielded-pool-for-zcash/, https://shieldedlabs.net/ironwood/ — checked 2026-11-10

### NU7 activated.
- NU7 activated on mainnet at block **3,543,405**, mined **2026-11-06 02:34 UTC** (late 2026-11-05 US time). — Secondary but consistent: https://www.coindesk.com/tech/2026/11/06/zcash-s-landmark-nu7-upgrade-goes-live-speeding-up-private-payments, https://www.theblock.co/news/defi/2026-11-06-zcashs-nu7-goes-live-435807 ; official target and height: https://zips.z.cash/zip-0259, https://zfnd.org/zebra-7-0-0-release/ — checked 2026-11-10
  - Note: ZIP 259 still shows status "Proposed" on the ZIP index; the activation itself is reported by press and the @Zcash X account ("NU7 has successfully activated on mainnet").
- NU7 contents per ZIP 259 (branch ID 0x77190AD9): — https://zips.z.cash/zip-0259 — checked 2026-11-10
  - **ZIP 218**: block target spacing **75 s → 25 s**; block subsidy divided by 3 and halving interval multiplied by 3 (post-NU7 halving interval 5,040,000 blocks), so issuance per day and the halving calendar stay the same and the 21M cap is unchanged. Per-block shielded limits: Orchard ≤330 actions, Ironwood ≤330 actions, Sapling ≤300 spends+outputs, Sprout 0 JoinSplits; global shielded budget 330 units. — https://zips.z.cash/zip-0218
  - **ZIP 235**: **60% of each block's transaction fees removed from circulation**, miner keeps 40%. **ZIP 237** (NSM halving-preserving issuance): removed amounts are re-issued via future block subsidies starting at mainnet height **8,939,664** (expected ~Feb 2031). — https://zips.z.cash/zip-0235, https://zfnd.org/zebra-7-0-0-release/
  - **ZIP 2003**: v4 transactions disallowed → **funds remaining in Sprout become unspendable** (not burned; a later upgrade could restore access). ~12,224 ZEC were in Sprout at activation (CoinDesk/The Block figure).
  - ZIP 207 rev 2, ZIP 214 rev 3 (dev fund consensus rules), ZIP 2008 (updates FS_FPF_ZCG_H3 address list).
  - **Not deployed in NU7**: ZIP 233, ZIP 234 (issuance smoothing). **ZSAs (ZIP 226/227) are not in NU7** — still Draft. — https://zips.z.cash/
- Node requirement: **Zebra 7.0.0** (released 2026-10-22) is the first stable release with NU7 mainnet support; operators had to upgrade before 3,543,405. Zebra 7.0.0 has an 8-week support window. — https://zfnd.org/zebra-7-0-0-release/ — checked 2026-11-10
- NU7 scope followed ZEC-weighted coinholder polling (Sept 2026): ~2.38M ZEC voted to **preserve halvings** vs ~22k for smoothing; ~2.32M ZEC for a **Feb 2031** NSM reissuance start; Sprout deprecation at NU7. — https://forum.zcashcommunity.com/t/nu7-sentiment-polls-results/57590 — checked 2026-11-10

---

## 2. Value pools — status on 2026-11-10

| Pool | Launched | Status now | Source |
|---|---|---|---|
| Transparent | 2016 launch | Active (public, like Bitcoin) | zips.z.cash/zip-0316 |
| Sprout | 2016 launch | No new value since Canopy (ZIP 211); **unspendable since NU7** (ZIP 2003) | zips.z.cash/zip-0211, zips.z.cash/zip-0259 |
| Sapling | Sapling upgrade, block 419,200 (Oct 2018) | Active | zips.z.cash/zip-0205 |
| Orchard | NU5, block 1,687,104 (May 2022) | **Sealed since NU6.3**: withdraw-only, migrate to Ironwood | zips.z.cash/zip-0252, zips.z.cash/zip-0258 |
| Ironwood | NU6.3, block 3,428,143 (2026-07-28) | Active; newest shielded pool | zips.z.cash/zip-0258 |

- Ironwood held ~82% of shielded balances by 2026-09-30 and ~90% of Orchard's sealed balance had crossed the turnstile by 2026-10-12 (CoinDesk research, sponsored — secondary; use only as "most").

## 3. The 2026 Orchard bug timeline
- 2026-05-29: Taylor Hornby (researching for Shielded Labs) reported a soundness bug in the Orchard Action circuit (variable-base scalar multiplication gadget in halo2_gadgets) found in an AI-assisted audit; it could have allowed balance violation (counterfeiting). — https://zips.z.cash/zip-0257 — checked 2026-11-10
- Emergency soft fork at mainnet height 3,363,426 disabled Orchard actions; **NU6.2** activated at 3,364,600 with the corrected circuit (new verifying key), re-enabling Orchard (2026-06-03). zcashd v6.20.0 / zebra v5.0.0. — https://zips.z.cash/zip-0257, https://forum.zcashcommunity.com/t/orchard-vulnerability-successfully-remediated/55976
- ZODL/forum: no evidence of exploitation; privacy unaffected. Shielded Labs: exploitation unlikely but not provable because Orchard data is shielded — hence Ironwood + turnstile. — same sources + https://shieldedlabs.net/ironwood/

## 4. Upgrade history (mainnet heights from deployment ZIPs)
- Launch (Sprout): October 2016. — https://z.cash/learn/who-created-zcash/
- Overwinter: 347,500 (June 2018). — https://zcash.readthedocs.io/en/master/rtd_pages/nu_dev_guide.html
- Sapling: 419,200 (Oct 2018). — https://zips.z.cash/zip-0205
- Blossom: block time 150 s → 75 s (ZIP 208); height 653,600 (constant used in ZIP 218). — https://zips.z.cash/zip-0208, https://zips.z.cash/zip-0218
- Heartwood: shielded coinbase (ZIP 213), FlyClient (ZIP 221). — readthedocs NU guide
- Canopy: 1,046,400 (Nov 2020, first halving); new dev fund; ZIP 211 stops new Sprout value. — https://zips.z.cash/zip-0251, readthedocs NU guide
- NU5: 1,687,104 (May 2022): Halo 2 (no trusted setup), Orchard, v5 tx, unified addresses. — https://zips.z.cash/zip-0252, readthedocs NU guide
- NU6: 2,726,400, 2024-11-23 (second halving); dev fund extended: 8% ZCG + 12% lockbox. — https://z.cash/upgrade/nu6/
- NU6.1: 3,146,400, 2025-11-24; ZIP 271 (lockbox disbursement) + ZIP 1016 (community & coinholder funding model). — https://z.cash/upgrade/nu6-1/, https://zips.z.cash/zip-0255
- NU6.2: 3,364,600 (June 2026), Orchard circuit fix. — https://zips.z.cash/zip-0257
- NU6.3 "Ironwood": 3,428,143, 2026-07-28. — https://zips.z.cash/zip-0258
- NU7: 3,543,405, 2026-11-06 UTC. — see §1

## 5. Funding, issuance, halving
- Max supply 21M ZEC; NU7 preserves cap and halving schedule. — https://zips.z.cash/zip-0218, https://zfnd.org/zebra-7-0-0-release/
- 1 ZEC = 100,000,000 zatoshi (ZIP 218 gives 0.52083333 ZEC = 52,083,333 zatoshi). — https://zips.z.cash/zip-0218
- Block subsidy: 1.5625 ZEC per 75 s block after the 2024 halving → 0.52083333 ZEC per 25 s block after NU7. — https://zips.z.cash/zip-0218
- Last halving: 2024-11-23 (block 2,726,400, NU6). Next (third) halving: originally height 4,406,400 under 75 s blocks; NU7 rescales the height but preserves timing, i.e. **around late 2028**. — https://zips.z.cash/zip-1016, https://zips.z.cash/zip-0218, https://z.cash/upgrade/nu6/
- Dev fund since NU6.1 (ZIP 1016): **8% of block subsidy → Zcash Community Grants (ZCG)**; **12% → a coinholder-controlled fund**, seeded from the deferred dev fund lockbox (ZIP 271). Runs until the third halving. Coinholder votes are quarterly, with 30-day public review; a grant passes with ≥420,000 ZEC participating and a simple majority; Key-Holder Organizations administer the multisig and may veto only on legal grounds or principled objection by two+ of them. — https://zips.z.cash/zip-1016, https://zips.z.cash/zip-0255 — checked 2026-11-10
- The remaining 80% of the subsidy goes to miners (100% − 20% dev fund). — derived from z.cash/upgrade/nu6/ (8% + 12% = 20%)
- Coinholder-Directed Grants run in quarterly rounds; Q1 2026 used the Zkool wallet and zecvote.zone; FPF announced results; ZF and Shielded Labs hold veto under ZIP 1016. — https://forum.zcashcommunity.com/t/polling-closed-coinholder-directed-grants-program-q1-round/55048
- NSM: ZIP 235 (60% fee removal) + ZIP 237 (reissue from height 8,939,664). Shielded Labs called it its first major mainnet deployment. — https://zips.z.cash/zip-0235, https://zfnd.org/zebra-7-0-0-release/
- ZCG was launched in 2020 as ZOMG, renamed Zcash Community Grants in Feb 2022. — https://z.cash/learn/who-created-zcash/

## 6. Organizations
- **Electric Coin Co. (ECC)**: formed 2015, built Zcash. In **January 2026 the entire ECC team left and formed ZODL** (Zcash Open Development Lab). — https://zodl.com/zashi-is-becoming-zodl/ (2026-02-16)
- **ZODL**: home of core protocol development; builds the **Zodl wallet (formerly Zashi)**. — https://zodl.com/about/
- **Zcash Foundation (ZF)**: formed 2017; builds **Zebra** (Rust full node), **FROST**, ZCAP (Community Advisory Panel), Zcon. Zcon7 was in Cancún, 2026-10-27..29. — https://zfnd.org/our-work/, https://zfnd.org/zcash-foundation-2026-stewardship-and-innovation/, https://z.cash/learn/who-created-zcash/
- **Shielded Labs**: Swiss, donation-funded (never funded by dev fund), works on NSM, Crosslink, Dynamic Fees, Ironwood. — https://shieldedlabs.net/
- **Valar Group** and **Project Tachyon**: built the **Zakura** full node (a fork of Zebra, announced 2026-07-15); contributed to Ironwood. — https://forum.zcashcommunity.com/t/zebra-zakura-and-the-road-through-nu6-3/56703
- **ZCG** (Zcash Community Grants): community grant committee funded by 8%. — ZIP 1016

## 7. Software
- **zcashd** is end-of-life: halted automatically at height 3,417,100 (2026-07-18) and supports neither NU6.3 nor NU7. — https://z.cash/support/zcashd-deprecation/
- **Zebra** (ZF, Rust): current major version **7.0.0** (2026-10-22), required for NU7. ZF maintains it as the independently governed reference implementation. — https://zfnd.org/zebra-7-0-0-release/, Zakura forum post
- **Zakura**: alternative full node from Valar Group / Project Tachyon, built from Zebra's code; ZF recommends running Zebra alongside as a consensus check. — forum post above
- **Z3 stack**: Zebra (node) + Zaino (indexer) + Zallet (wallet) replaces zcashd. **Zallet** is the CLI wallet replacing zcashd's built-in wallet. — https://zfnd.org/zcash-foundation-2026-stewardship-and-innovation/, https://zodl.com/ironwood-a-new-shielded-pool-for-zcash/
- **lightwalletd** still used by light wallets (e.g. v0.5.4/v0.5.5 referenced in Oct 2026). — https://forum.zcashcommunity.com/t/nu7-timeline/57655
- Wallets with Ironwood support (Aug 2026): Zodl, Vizor, Cake Wallet, Zkool, Zingo!, NozyWallet, zallet, zecd, Keystone (hardware). **Ywallet: developer said it will not be updated for Ironwood.** — https://forum.zcashcommunity.com/t/ironwood-is-here-updated-wallets-libraries-aug-20/56557

## 8. Addresses, keys, cryptography
- **Unified address (UA)**: one address bundling receivers (Orchard, Sapling, transparent P2PKH/P2SH); sender uses the most preferred receiver it supports (Orchard > Sapling > transparent). Mainnet UAs start with "u1". Ironwood reuses Orchard receivers, so UAs keep working. — https://zips.z.cash/zip-0316, https://zodl.com/ironwood-a-new-shielded-pool-for-zcash/
- **Viewing keys**: Unified Full Viewing Key (UFVK, all incoming+outgoing) and Unified Incoming Viewing Key (UIVK, only incoming). Cannot spend. — https://zips.z.cash/zip-0316
- **Halo 2** proofs (NU5 onward) require **no trusted setup**; Sprout/Sapling used trusted-setup parameters. — readthedocs NU guide
- **Halo** was introduced in "Recursive Proof Composition without a Trusted Setup" by Sean Bowe, Jack Grigg and Daira Hopwood (2019). Do not attribute the discovery to a single person. — https://eprint.iacr.org/2019/1021 — checked 2026-11-10
- **FROST**: ZF's Rust implementation of Flexible Round-Optimised Schnorr Threshold signatures (RFC 9591); the only current way to do multisig-style signing for shielded Zcash; ZIP 312 still Draft; 2026 goals: FROST v3, finalize ZIP 312. — https://zfnd.org/our-work/, https://zfnd.org/zcash-foundation-2026-stewardship-and-innovation/, https://zips.z.cash/
- **ZSAs** (Zcash Shielded Assets): ZIPs 226/227 are **Draft**; not deployed. — https://zips.z.cash/
- **ZIP process**: defined by ZIP 0 (Active); ZIP Editors manage numbers. — https://zips.z.cash/

---

## Unverified / conflicting (do NOT state as fact in the product)
- Exact NU7 activation confirmation from a primary org page: z.cash/upgrade lists NU7 but no page we could read states "activated". Activation is confirmed by The Block, CoinDesk and a @Zcash X post (not fetchable). Treat as activated; avoid quoting the exact minute.
- Exact height of the third halving after NU7 (our derivation from ZIP 218 gives ≈6,132,390; a tool summary gave 6,192,390). Say only "around late 2028".
- Sprout balance at NU7 (~12,224 ZEC) — press figure only.
- Turnstile / migration percentages (80%, 90.1%, 4.06M ZEC in Ironwood) — community/sponsored sources; say "most".
- Whether Orchard→Sapling spends are consensus-valid: ZIP 258 allows value to leave Orchard; ZIP 318 forbids wallets offering Sapling migration. Don't discuss.
- Proposal for 20-second blocks after NU7 — only a proposal, leave out.
- z.cash/upgrade numbering conflicts ("NU7 = ninth", "NU6.2 = ninth", "NU6.3 = tenth") — don't number upgrades.
- Name of the organization that administers ZCG (FPF appears in ZIP 2008 stream name and grant announcements) — don't name it in lessons.
- Price / market data — never used.
