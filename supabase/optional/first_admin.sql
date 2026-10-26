-- İlk yöneticiyi atama
-- 1) Sitede kendi e-postanla giriş yap ve profilini oluştur
-- 2) Aşağıdaki e-postayı kendininkiyle değiştirip SQL Editor'de çalıştır

update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'SENIN@EPOSTAN.com');

-- Sonraki yöneticileri/üreticileri sitedeki Yönetim → Kullanıcılar ekranından atayabilirsin.
