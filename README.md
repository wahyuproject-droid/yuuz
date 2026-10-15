# YuuZ Market V6 — Tema Hitam/Putih & UI Rapi

Dua website terpisah: **USER** dan **ADMIN**. Dibangun dengan HTML5, CSS3, JavaScript Vanilla dan Supabase. Katalog dapat dilihat tanpa login; memasukkan produk ke keranjang, checkout dan top up memerlukan akun terdaftar. Tidak ada login tamu. Tidak ada produk, rekening, saldo, atau transaksi palsu bawaan.

## 1. Pasang / upgrade dalam satu SQL

1. Buat project Supabase baru, atau gunakan project dari paket YuuZ Market v1/v2/v3/v4. Backup database lama sebelum upgrade.
2. Buka **SQL Editor**, salin seluruh **database.sql** dari ZIP ADMIN, lalu Run satu kali. Script mencakup schema, upgrade, RLS, fungsi, bucket, audit, ledger, dan job kedaluwarsa. Bisa dijalankan ulang pada schema paket yang didukung tanpa menggandakan data awal atau menghapus saldo/pesanan.
3. Buat akun admin melalui **Authentication → Users** menggunakan email/password dan konfirmasi email. Tetapkan role melalui SQL Editor, ganti email:

```sql
insert into public.profiles(id,role)
select id,'admin' from auth.users where email='admin@example.com'
on conflict(id) do update set role='admin';
```

Pendaftaran publik selalu menghasilkan role customer, bukan admin. Password diproses Supabase Auth; tidak disimpan di tabel profil atau config.

4. Di Supabase Auth, aktifkan **Email / Password** dan **Allow new users to sign up**. **Nonaktifkan Anonymous Sign-ins.** Backend V4 juga menolak identitas anonymous dan akun suspended untuk operasi pembelian/top up.
5. Atur password policy di Supabase: minimum **8 karakter**, sesuai validasi aplikasi yang juga meminta huruf dan angka. Aktifkan verifikasi email sesuai kebijakan toko. Jika verifikasi dinonaktifkan, Auth melakukan konfirmasi otomatis; jika aktif, pembeli membuka email sebelum login. SQL mensyaratkan identitas email yang telah dikonfirmasi.
6. Isi **Site URL / Redirect URLs** pada Auth sesuai alamat USER yang sebenarnya. Izinkan root situs dan URL pemulihan `https://DOMAIN_USER/?flow=recovery`. Jika di subfolder, gunakan alamat subfolder tersebut. Untuk pengembangan tambahkan localhost/port yang digunakan. Jangan mengarahkan email recovery ke website ADMIN.
7. Untuk email publik dan reset password produksi, konfigurasi **Custom SMTP** Supabase. Layanan email bawaan membatasi tujuan ke anggota project/team; jangan menganggap email konfirmasi/reset akan terkirim ke pelanggan umum tanpa SMTP yang sesuai. Uji pengiriman email dan tautan balik sebelum digunakan.
8. Salin Project URL dan publishable/anon key ke **config.js pada USER dan ADMIN**, menggunakan project yang sama:

```js
window.YUUZ_CONFIG = Object.freeze({
  SUPABASE_URL: "https://PROJECT_KAMU.supabase.co",
  SUPABASE_ANON_KEY: "PUBLISHABLE_ATAU_ANON_KEY_KAMU"
});
```

Jangan menaruh `service_role`, `sb_secret_…`, password admin, password database, atau API secret di frontend.

9. Upload isi folder USER dan ADMIN ke dua alamat HTTPS terpisah, misalnya `yuuzmarket.id` dan `admin.yuuzmarket.id`. `index.html` harus berada di root masing-masing folder. Tidak membutuhkan npm/build, PHP atau server Node.
10. Login Admin, atur toko/WhatsApp/metode pembayaran asli, tambah produk, lalu uji register/login User, top up dan persetujuan, serta pembelian langsung/saldo.

Jika Cron belum dapat diaktifkan, SQL menampilkan peringatan dan Admin menampilkan status setup. Aktifkan **Integrations → Cron / pg_cron**, kemudian jalankan `database.sql` lagi. Job `yuuz-payment-timeouts` harus aktif dan run history sukses sebelum kedaluwarsa dapat diandalkan.

### Untuk database lama

Data produk, banner, kategori, metode pembayaran dan pesanan lama dipertahankan. Akun email yang sudah ada mendapat profil dan wallet awal Rp0; saldo tidak dibuat berdasarkan transaksi lama yang belum merupakan ledger wallet. Akun lama dengan username bawaan perlu membuka Pengaturan Akun, memilih username 3–24 karakter, mengisi WhatsApp, dan menyetujui syarat sebelum transaksi. Role admin lama tetap tersimpan.

Riwayat akun anonymous lama tetap tersedia bagi Admin; tidak otomatis dipindahkan ke akun email baru karena itu dapat membuka akses transaksi orang lain. Pelanggan dapat menghubungi admin untuk tindak lanjut. Schema yang telah diubah di luar paket asli memerlukan pemeriksaan migrasi tersendiri.

## 2. Menjalankan lokal / WebView

Dari folder USER:

```bash
python3 -m http.server 8080
```

Untuk ADMIN gunakan port lain, misalnya 8081. Buka melalui HTTP localhost, bukan `file://`. Produksi wajib HTTPS untuk Auth, UUID, Clipboard, dan pengiriman bukti. Hash routing tidak memerlukan rewrite.

Android WebView perlu JavaScript, DOM storage, HTTPS, file picker, handler download QRIS dan intent/browser eksternal untuk WhatsApp. Email verifikasi/reset harus bisa kembali ke URL USER; uji alur di browser eksternal dan WebView. Paket ini basis website/WebView, bukan APK.

SDK Supabase dipin **2.117.3** dari CDN dan mempunyai fallback lokal dengan versi sama. Ikon SVG Lucide dibundel lokal beserta lisensi. Font Plus Jakarta Sans dari Google Fonts memakai Arial sebagai cadangan. Internet diperlukan untuk Auth/database/Storage/Realtime. Jika storage browser diblokir, keranjang/retry memakai memori selama halaman terbuka; login persisten tetap bergantung dukungan storage Auth/browser.

## 3. Akun pengguna

- Register: username unik 3–24 karakter (huruf awal, lalu huruf/angka/underscore), email, WhatsApp, password, konfirmasi dan persetujuan layanan.
- Username dicek lagi oleh unique index server; email/password dikelola Auth. UI tidak menambah role/saldo lewat metadata.
- Pesan login salah bersifat umum agar tidak memastikan apakah email tertentu terdaftar. Reset password memakai pesan umum dan recovery session Supabase.
- Profil menampilkan avatar, username, email, WhatsApp, saldo, riwayat dan logout.
- Pengaturan akun memakai RPC terbatas untuk profil; password baru diproses Auth. Penggantian password biasa meminta password saat ini; recovery dari tautan email memakai sesi pemulihan.
- Avatar PNG/JPG/WebP maksimal 2 MB di bucket `avatars` milik folder user sendiri. Jangan memasukkan data sensitif ke avatar; gambar avatar bersifat publik.
- Admin dapat melihat pelanggan dan ledger, serta menonaktifkan/mengaktifkan akun dengan catatan. Tidak tersedia form untuk memberi role admin atau mengubah saldo sembarangan.

## 4. YuuZ Wallet dan ledger

`wallets.balance` adalah **saldo tersedia**, `wallets.held_balance` adalah **saldo ditahan**. Keduanya sumber kebenarannya di database, bukan LocalStorage.

| Operasi | Perubahan tersedia | Perubahan ditahan |
|---|---:|---:|
| Top up di-ACC | +nominal | 0 |
| Checkout saldo | -total | +total |
| Pembelian saldo di-ACC | 0 | -total |
| Pembelian saldo ditolak/dibatalkan sebelum ACC | +total | -total |
| Refund pembelian saldo di-ACC oleh admin | +total | 0 |

Setiap baris perubahan dicatat di `wallet_transactions` dengan idempotency key unik, saldo sesudah transaksi, actor, waktu, order/top up dan catatan. Wallet di-lock dan diubah dalam transaksi yang sama dengan ledger. Tidak ada API browser untuk mengedit saldo, menarik tunai, atau mengirim saldo ke pengguna lain.

Saldo hanya kredit internal untuk belanja di YuuZ Market. Saldo yang ditahan tidak dapat digunakan kembali pada checkout lain. Jika saldo tidak cukup atau stok tidak cukup, seluruh checkout rollback tanpa memotong saldo maupun stok.

## 5. Top up manual

1. User login → Saldo → Top Up.
2. Isi nominal Rp1.000–Rp100.000.000 dan pilih metode aktif dari Admin.
3. Server membuat UUID permintaan, snapshot tujuan transfer dan deadline.
4. User transfer sesuai nominal, memilih screenshot JPG/PNG/WebP maksimal 5 MB, melihat preview/progress, lalu menekan Kirim Bukti.
5. Status Menunggu ACC. **Upload tidak menambah saldo.**
6. Admin membuka Persetujuan → Permintaan Top Up, mencocokkan mutasi penerimaan dan bukti, lalu ACC atau Tolak.
7. ACC menambah saldo satu kali dan mencatat ledger/notifikasi. Tolak memerlukan alasan dan tidak menambah saldo. Admin dapat memberikan kesempatan kirim bukti baru dengan deadline baru.

Satu pengguna maksimal memiliki lima permintaan top up pending/verifikasi bersamaan. Maksimal 10 pengiriman bukti dan 12 berkas tersimpan per transaksi. Nominal dan status permintaan tidak dapat diubah pelanggan melalui API tabel.

## 6. Pembelian melalui persetujuan admin

### Menggunakan saldo

Checkout dengan pilihan **YuuZ Wallet** menahan saldo dan stok sekaligus; status **Menunggu ACC Admin**. Belum dianggap selesai dan tidak menyerahkan akun otomatis.

Admin membuka Persetujuan → Permintaan Pembelian. ACC memfinalisasi saldo ditahan dan mengubah status menjadi Diproses tanpa memotong stok kedua kali. Tolak memerlukan alasan, mengembalikan saldo tersedia dan stok sekali, serta menandai pembelian Ditolak. Saldo ditahan tidak dibatalkan otomatis ketika target waktu admin terlewati; sistem menandai tindak lanjut.

### Pembayaran langsung

User dapat memilih QRIS, e-wallet atau bank yang diatur Admin. Checkout membuat snapshot harga/tujuan dan menahan stok. User wajib mengirim bukti transfer sebelum deadline. Admin memeriksa dana, kemudian ACC atau Tolak. Alur screenshot privat, alasan penolakan, izin upload ulang dan audit tetap tersedia.

Setelah ACC, admin menyerahkan data login akun secara pribadi, lalu menandai pesanan Selesai. Jangan menyimpan password akun game pada produk, screenshot publik atau settings.

### Refund

Refund ke Wallet pada pembelian saldo yang sudah di-ACC mengembalikan saldo satu kali melalui ledger. Pengulangan permintaan tidak menambah saldo ganda. Refund tidak otomatis mengembalikan stok atau mengambil kembali akun yang sudah diserahkan; hal itu ditangani admin sesuai kondisi transaksi.

Refund pembayaran langsung tetap berupa pencatatan manual; admin mengembalikan dana melalui layanan pembayaran yang bersangkutan. Menandai refund tidak mengirim uang melalui gateway.

## 7. Pembayaran, deadline dan bukti privat

Metode pembayaran **dipakai bersama** untuk top up dan pembelian langsung. Admin dapat mengelola QRIS, DANA, OVO, GoPay, ShopeePay, LinkAja, bank dan custom; gambar QRIS, logo, nomor, pemilik dan instruksi. Tidak ada tujuan pembayaran contoh aktif bawaan. Snapshot pada transaksi tidak berubah ketika Admin mengedit/menghapus metode kemudian.

- Pembayaran manual default 1 × 24 jam sejak dibuat, sesuai deadline database. Pengaturan toko dapat memperpendek menjadi 1–24 jam untuk transaksi/deadline baru.
- Top up/pesanan tanpa bukti tepat waktu menjadi Kedaluwarsa melalui job database setiap menit. Upload/submit sudah ditolak setelah deadline walaupun status job belum diperbarui.
- Bukti yang telah diterima tepat waktu tetap menunggu admin. Target verifikasi maksimal 24 jam. Terlambat ditandai perlu tindak lanjut, bukan otomatis ditolak.
- Stok pesanan manual dilepas sekali pada kedaluwarsa/pembatalan. Top up tidak menahan stok.
- Bukti di bucket **payment-proofs privat**; pemilik transaksi dan admin meminta signed URL berlaku 5 menit. Jangan membagikan URL bukti, karena tautan tersebut dapat dipakai selama masa berlakunya.
- Bukti yang terkirim tidak dapat ditimpa/dihapus lewat browser. Ganti/hapus sebelum kirim berlaku pada preview lokal. Draft yang ditinggalkan dapat diaudit oleh pemilik project melalui Storage.
- Jika bukti transfer gagal disubmit setelah deadline, hubungi admin; tidak ada pengesahan pembayaran otomatis dari file yang belum terdaftar.

## 8. Realtime, riwayat dan notifikasi

Navigasi mobile: Beranda, Kategori, Saldo, Transaksi, Akun. Keranjang dan notifikasi tersedia di header. Desktop memiliki navbar horizontal.

Transaksi Saya menggabungkan Pembelian dan Top Up. Detail memuat status, alasan penolakan, deadline, bukti dan tautan WhatsApp. Notifikasi di database dicatat untuk status transaksi; daftar notifikasi dapat ditandai dibaca.

Realtime memperbarui wallet, status dan notifikasi saat aplikasi terbuka. Form/unggahan tidak dihapus saat event datang; saldo badge diperbarui dan halaman detail dimuat setelah pengiriman. Dashboard admin menampilkan jumlah pending dan notifikasi bukti baru. Ini notifikasi dalam aplikasi, bukan email/push notification perangkat.

## 9. Periksa job server

```sql
select jobid,jobname,schedule,active
from cron.job where jobname='yuuz-payment-timeouts';

select status,return_message,start_time,end_time
from cron.job_run_details order by start_time desc limit 20;

-- SQL Editor / owner saja:
select public.process_payment_timeouts();
```

Checkout, hold/capture/release, top up, ACC/Tolak, ledger dan audit memakai fungsi PostgreSQL dengan otorisasi server. Proses kedaluwarsa memakai pg_cron. Tidak diperlukan Edge Function untuk alur manual ini. Frontend HTML/JS tidak menggantikan fungsi server tersebut.

## 10. Produk, banner dan tampilan

Poster selalu foto pertama. Mendukung hingga **100 screenshot** tambahan, multiple selection, drag-and-drop, preview, hapus dan urutan lewat tombol panah. User mendukung swipe, thumbnail, fullscreen, zoom dan pinch bawaan perangkat.

Aset produk/banner/logo: PNG/JPG/WebP maksimal 8 MB tiap gambar, 40 megapiksel. PNG dipertahankan; foto JPEG/WebP di atas 2400 px diperkecil dengan kualitas .95 jika lebih kecil. Bukti transfer tidak dikompresi supaya informasi transaksi tetap terbaca. Upload SVG ditolak; ikon dan banner SVG bawaan merupakan aset lokal.

Banner 3:1, disarankan 2170 × 725 px. Dua banner bawaan tersedia; Admin dapat tambah/edit/hapus/nonaktifkan/urutkan. User memakai dua banner bawaan sebagai fallback jika tidak ada banner aktif. Kategori yang dipakai produk tidak bisa dihapus; produk dengan pesanan aktif tidak bisa dihapus. Berkas Storage yang tidak terpakai tetap disimpan untuk keamanan snapshot dan dapat dibersihkan setelah audit terpisah.

## Memeriksa job

Jalankan di SQL Editor sebagai pemilik project:

```sql
select jobid,jobname,schedule,active
from cron.job where jobname='yuuz-payment-timeouts';

select status,return_message,start_time,end_time
from cron.job_run_details order by start_time desc limit 20;

-- Uji pemrosesan segera tanpa menunggu jadwal:
select public.process_payment_timeouts();
```

Pastikan job aktif dan riwayat eksekusinya sukses. RPC job tidak dapat dijalankan oleh pembeli/admin frontend. Jika perlu mengganti/menyalakan jadwal, jalankan `database.sql` lagi; nama job yang sama memperbarui jadwal, bukan membuat job lain.



## 11. Pengujian dan batas penggunaan

Lihat **HASIL-PENGUJIAN.md**. Pengujian SQL dijalankan pada PGlite/PostgreSQL dengan schema Auth/Storage simulasi, dan interaksi DOM memakai SDK/transport mock. Auth email/Supabase hosted, Storage HTTP nyata, Realtime hosted, Cron hosted, render browser HP/PC dan APK/WebView belum diverifikasi pada project kamu. Jangan menganggap paket sudah terhubung sebelum config dan SQL/Auth dikonfigurasi.

Uji dua browser untuk checkout stok satu/saldo sama, top up ACC ganda, penolakan, retry, bukti milik pengguna lain, email konfirmasi/reset, target redirect, job tanpa browser terbuka, serta layout 320/360/390/768/1024/1440 px sebelum menerima transaksi nyata.

Dokumentasi resmi:

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/cron/quickstart
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://lucide.dev/license

## Pembaruan V5 — pasang kedua website dan jalankan ulang SQL

- Unggah seluruh file USER dan ADMIN, termasuk `assets/theme.js`. Jalankan **database.sql terbaru** sekali di project yang sama. Cukup frontend saja tidak memperbarui perilaku notifikasi database.
- Bar pengumuman hitam di atas header dihapus. Pengaturan teks lama dipertahankan demi kompatibilitas, tetapi tidak ditampilkan lagi di header USER.
- Tombol matahari/bulan tersedia di header USER, login ADMIN dan header dashboard. Pilihan tersimpan pada browser; kunjungan pertama mengikuti tema sistem. Penyimpanan browser yang diblokir tidak mematahkan halaman.
- QRIS, tombol download dan nomor transfer muncul hanya saat transaksi masih pending, belum pernah menerima bukti, serta batas pembayaran belum lewat. Setelah submit, ACC, selesai, ditolak, kedaluwarsa atau dibatalkan, tujuan bayar ditutup. Jika admin membuka upload ulang, pembeli mengirim ulang bukti tanpa diminta transfer kedua kali.
- Satu kartu notifikasi per transaksi diperbarui saat status berubah; kartu yang sudah dibaca menjadi belum dibaca lagi saat ada perubahan baru. Notifikasi transaksi lama yang berulang digabung berdasarkan pemilik dan ID transaksi. Audit status, bukti, ledger dan pesanan tetap disimpan. Notifikasi akun seperti penonaktifan tetap terpisah karena bukan transaksi.
- Struk premium muncul setelah top up disetujui atau pembayaran pesanan diverifikasi. Struk pembayaran yang pesanannya masih diproses menjelaskan hal itu; label Pesanan Selesai hanya muncul setelah admin benar-benar menyelesaikan pesanan. Nominal dan waktu berasal dari data transaksi tersimpan.
- Realtime tetap memakai publikasi dan RLS dari SQL yang sama. Pembeli tidak dapat menyetujui pembayaran, menulis saldo maupun mengubah isi notifikasi sendiri.

Lihat `HASIL-PENGUJIAN.md` untuk pengujian otomatis dan batas pengujian nyata.

## Pembaruan V6 — bar atas dihapus, tema hitam/putih

- Bar “Belanja akun pilihan di YuuZ Market” tidak lagi dibuat oleh USER. Field pengumuman yang sudah tidak ditampilkan juga dihapus dari pengaturan ADMIN; data lama di database tidak dipakai untuk membuat bar.
- Tombol hitam/putih menampilkan ikon bulan/matahari dan label Gelap/Terang pada desktop. Di header mobile label disembunyikan agar tombol tetap muat; nama aksesibel tetap tersedia. Pilihan tema bertahan setelah refresh dan mengikuti perubahan dari tab lain pada origin yang sama.
- Mode gelap memakai charcoal/hitam, mode terang memakai putih. Aksen biru YuuZ Market dipertahankan. Warna label form, teks kecil, notifikasi, layar masuk dan kartu diperbaiki untuk keterbacaan.
- Semua aset awal lokal memakai penanda versi baru agar browser meminta CSS/JavaScript terbaru. Ini membantu setelah index.html terbaru sudah diterima; cache HTML/CDN/WebView di hosting tetap perlu dibersihkan jika masih menyajikan index lama.
- Untuk upgrade dari V5: backup **config.js yang telah diisi**, unggah isi ZIP terbaru ke website USER dan ADMIN masing-masing, lalu kembalikan config milik toko. Schema SQL tidak berubah dari V5, jadi tidak ada migrasi tambahan untuk perubahan tampilan ini. Jika masih memakai V4 atau lebih lama, ikuti instruksi database.sql terbaru sebelumnya.
- Jika bar lama masih terlihat di hosting, pastikan seluruh file berasal dari paket V6 dan muat ulang dengan Ctrl+Shift+R. Pada WebView/APK, bersihkan cache WebView atau muat ulang aset aplikasi.

Hasil pengujian V6 tersedia di HASIL-PENGUJIAN.md; ini adalah paket sumber, bukan perubahan langsung pada hosting yang sudah aktif.
