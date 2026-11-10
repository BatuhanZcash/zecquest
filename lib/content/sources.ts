import type { Source } from "./types";

/**
 * Shared primary sources for lessons and glossary. Every fact in the content is
 * backed by research/FACTS.md; these are the links it relies on.
 */
const C = "2026-11-10";
const s = (title: string, url: string): Source => ({ title, url, checked: C });

export const SRC = {
  whoCreated: s("Who created Zcash? (z.cash)", "https://z.cash/learn/who-created-zcash/"),
  nuGuide: s("Network Upgrade Guide (Zcash documentation)", "https://zcash.readthedocs.io/en/master/rtd_pages/nu_dev_guide.html"),
  zip0: s("ZIP index and ZIP 0: ZIP Process", "https://zips.z.cash/"),
  zip205: s("ZIP 205: Deployment of the Sapling Network Upgrade", "https://zips.z.cash/zip-0205"),
  zip208: s("ZIP 208: Shorter Block Target Spacing (Blossom)", "https://zips.z.cash/zip-0208"),
  zip211: s("ZIP 211: Disabling Addition of New Value to the Sprout Chain Value Pool", "https://zips.z.cash/zip-0211"),
  zip218: s("ZIP 218: Block target spacing and shielded limits (NU7)", "https://zips.z.cash/zip-0218"),
  zip235: s("ZIP 235: Remove 60% of Transaction Fees From Circulation", "https://zips.z.cash/zip-0235"),
  zip251: s("ZIP 251: Deployment of the Canopy Network Upgrade", "https://zips.z.cash/zip-0251"),
  zip252: s("ZIP 252: Deployment of the NU5 Network Upgrade", "https://zips.z.cash/zip-0252"),
  zip255: s("ZIP 255: Deployment of the NU6.1 Network Upgrade", "https://zips.z.cash/zip-0255"),
  zip257: s("ZIP 257: Orchard Temporary Vulnerability Mitigation and NU6.2", "https://zips.z.cash/zip-0257"),
  zip258: s("ZIP 258: Deployment of the NU6.3 Network Upgrade", "https://zips.z.cash/zip-0258"),
  zip259: s("ZIP 259: Deployment of the NU7 Network Upgrade", "https://zips.z.cash/zip-0259"),
  zip316: s("ZIP 316: Unified Addresses and Unified Viewing Keys", "https://zips.z.cash/zip-0316"),
  zip318: s("ZIP 318: Orchard to Ironwood Migration", "https://zips.z.cash/zip-0318"),
  zip1016: s("ZIP 1016: Community and Coinholder Funding Model", "https://zips.z.cash/zip-1016"),
  nu6: s("Network Upgrade 6 (z.cash)", "https://z.cash/upgrade/nu6/"),
  nu61: s("Network Upgrade 6.1 (z.cash)", "https://z.cash/upgrade/nu6-1/"),
  zebra7: s("Zebra 7.0.0 Release (Zcash Foundation)", "https://zfnd.org/zebra-7-0-0-release/"),
  zfWork: s("Our Work (Zcash Foundation)", "https://zfnd.org/our-work/"),
  zf2026: s("Zcash Foundation 2026: Stewardship and Innovation", "https://zfnd.org/zcash-foundation-2026-stewardship-and-innovation/"),
  zcashdEol: s("zcashd Deprecation (z.cash)", "https://z.cash/support/zcashd-deprecation/"),
  zodlAbout: s("About ZODL", "https://zodl.com/about/"),
  zodlRename: s("Zcash Wallet Zashi Is Becoming Zodl", "https://zodl.com/zashi-is-becoming-zodl/"),
  zodlIronwood: s("Ironwood: A New Shielded Pool for Zcash (ZODL)", "https://zodl.com/ironwood-a-new-shielded-pool-for-zcash/"),
  slHome: s("Shielded Labs", "https://shieldedlabs.net/"),
  slIronwood: s("Ironwood (Shielded Labs)", "https://shieldedlabs.net/ironwood/"),
  forumIronwood: s("Ironwood is Here! Updated Wallets, Libraries (Zcash Community Forum)", "https://forum.zcashcommunity.com/t/ironwood-is-here-updated-wallets-libraries-aug-20/56557"),
  forumOrchardFix: s("Orchard Vulnerability Successfully Remediated (Zcash Community Forum)", "https://forum.zcashcommunity.com/t/orchard-vulnerability-successfully-remediated/55976"),
  forumZakura: s("Zebra, Zakura, and the road through NU6.3 (Zcash Foundation, forum)", "https://forum.zcashcommunity.com/t/zebra-zakura-and-the-road-through-nu6-3/56703"),
  forumNu7Polls: s("NU7 Sentiment Polls Results (Zcash Community Forum)", "https://forum.zcashcommunity.com/t/nu7-sentiment-polls-results/57590"),
  forumNu7Timeline: s("NU7 Timeline (Zcash Community Forum)", "https://forum.zcashcommunity.com/t/nu7-timeline/57655"),
  forumCoinholderQ1: s("Polling Closed: Coinholder-Directed Grants Program, Q1 round (forum)", "https://forum.zcashcommunity.com/t/polling-closed-coinholder-directed-grants-program-q1-round/55048"),
  forum: s("Zcash Community Forum", "https://forum.zcashcommunity.com/"),
  frost: s("FROST reference implementation (Zcash Foundation, GitHub)", "https://github.com/ZcashFoundation/frost/"),
} satisfies Record<string, Source>;
