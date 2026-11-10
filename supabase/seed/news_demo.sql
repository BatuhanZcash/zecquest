-- Optional demo content for Gündem (local / preview databases). NOT a migration.
--   psql "$DB" -f supabase/seed/news_demo.sql
-- The 5 Nov 2026 issue, written as the facts stood before NU7 activated. Every item cites a primary source:
--   ZIP 259 (NU7 deployment), ZIP 218 (block spacing), ZIP 235 (fee removal), Zcash Foundation (Zebra 7.0.0).

begin;
delete from public.news_digests where date = '2026-11-05';

insert into public.news_digests (date, status, base_lang, published_at, created_at, updated_at)
values ('2026-11-05', 'published', 'en', '2026-11-05 09:00+00', '2026-11-05 08:00+00', '2026-11-05 09:00+00');

insert into public.news_digest_items (id, digest_date, position, section, tier, url, source_name, attribution, kind, verified, related_slug) values
  ('8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7001', '2026-11-05', 0, 'upgrade',  'lead',  'https://zips.z.cash/zip-0259', 'ZIP 259', null, 'fact', true, null),
  ('8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7002', '2026-11-05', 1, 'nodes',    'brief', 'https://zfnd.org/zebra-7-0-0-release/', 'Zcash Foundation', null, 'fact', true, null),
  ('8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7003', '2026-11-05', 2, 'protocol', 'brief', 'https://zips.z.cash/zip-0235', 'ZIP 235', null, 'fact', true, null),
  ('8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7004', '2026-11-05', 3, 'protocol', 'brief', 'https://zips.z.cash/zip-0218', 'ZIP 218', null, 'fact', true, null),
  ('8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7005', '2026-11-05', 4, 'protocol', 'watch', 'https://zips.z.cash/zip-0259', 'ZIP 259', null, 'fact', true, null);

insert into public.news_digest_versions (digest_date, lang, title, intro, items) values
('2026-11-05', 'en', 'NU7 is almost here',
 'Zcash''s next network upgrade is scheduled for mainnet block 3,543,405. Here is what changes and what node operators need to do.',
 jsonb_build_object(
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7001', jsonb_build_object(
    'title', 'NU7 activates at block 3,543,405',
    'summary', 'The network upgrade is scheduled for mainnet block 3,543,405. zcashd does not support NU7: node operators need Zebra 7.0.0.',
    'facts', jsonb_build_array(
      jsonb_build_object('value', '75 → 25 s', 'label', 'Block time. Daily issuance and the halving schedule stay the same.'),
      jsonb_build_object('value', '60%', 'label', 'of each block''s transaction fees removed from circulation (NSM)'),
      jsonb_build_object('value', 'Sprout', 'label', 'Funds left in the Sprout pool become unspendable'))),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7002', jsonb_build_object(
    'title', 'Node operators: upgrade to Zebra 7.0.0',
    'summary', 'Zebra 7.0.0, released on 22 October, is the first stable Zebra release with NU7 mainnet support. Nodes must run it before block 3,543,405.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7003', jsonb_build_object(
    'title', '60% of transaction fees leave circulation',
    'summary', 'Under ZIP 235, 60% of each block''s transaction fees are removed from circulation and the miner keeps 40%. ZIP 237 re-issues the removed amounts through future block subsidies.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7004', jsonb_build_object(
    'title', 'A block every 25 seconds, same daily issuance',
    'summary', 'ZIP 218 cuts the block target spacing from 75 to 25 seconds and divides the block subsidy by three, so issuance per day, the halving calendar and the 21M cap do not change.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7005', jsonb_build_object(
    'title', 'Sprout funds become unspendable',
    'summary', 'NU7 disallows v4 transactions (ZIP 2003), so ZEC still in the Sprout pool can no longer be spent. The funds are not burned; a later upgrade could restore access.'))),
('2026-11-05', 'tr', 'NU7 kapıda',
 'Zcash''in bir sonraki ağ yükseltmesi 3.543.405. blokta devreye girecek. Neyin değiştiği ve düğüm işletenlerin ne yapması gerektiği.',
 jsonb_build_object(
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7001', jsonb_build_object(
    'title', 'NU7 kapıda',
    'summary', 'Ağ yükseltmesi ana ağda 3.543.405. blokta devreye girecek. zcashd NU7''yi desteklemiyor: düğümler Zebra 7.0.0''a geçmeli.',
    'facts', jsonb_build_array(
      jsonb_build_object('value', '75 → 25 sn', 'label', 'Blok süresi. Günlük yeni ZEC miktarı ve yarılanma takvimi değişmiyor.'),
      jsonb_build_object('value', '%60', 'label', 'Her bloktaki işlem ücretlerinin dolaşımdan çıkan payı (NSM)'),
      jsonb_build_object('value', 'Sprout', 'label', 'İlk gizlilik havuzunda kalan ZEC harcanamaz olacak'))),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7002', jsonb_build_object(
    'title', 'Düğüm işletenler Zebra 7.0.0''a geçmeli',
    'summary', '22 Ekim''de çıkan Zebra 7.0.0, ana ağda NU7''yi destekleyen ilk kararlı Zebra sürümü. Düğümlerin 3.543.405. bloktan önce bu sürüme geçmesi gerekiyor.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7003', jsonb_build_object(
    'title', 'İşlem ücretlerinin %60''ı dolaşımdan çıkıyor',
    'summary', 'ZIP 235''e göre her bloktaki işlem ücretlerinin %60''ı dolaşımdan çıkarılıyor, madenci %40''ını alıyor. ZIP 237 bu miktarı ileride blok ödülleriyle yeniden dağıtıyor.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7004', jsonb_build_object(
    'title', '25 saniyede bir blok, günlük arz aynı',
    'summary', 'ZIP 218 blok aralığını 75 saniyeden 25 saniyeye indiriyor ve blok ödülünü üçe bölüyor; günlük yeni ZEC miktarı, yarılanma takvimi ve 21 milyon üst sınırı değişmiyor.'),
  '8a3c6a52-0b1e-4c51-9d0e-5a0b2f0c7005', jsonb_build_object(
    'title', 'Sprout''taki ZEC harcanamaz hale geliyor',
    'summary', 'NU7 v4 işlemlerini kaldırıyor (ZIP 2003); Sprout havuzunda kalan ZEC artık harcanamıyor. Bu fonlar yakılmıyor; ileride bir yükseltme erişimi geri açabilir.')));
commit;
