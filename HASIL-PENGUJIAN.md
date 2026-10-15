# Hasil Pengujian YuuZ Market V4

Tanggal: 15 Oktober 2026. Source HTML/CSS/JS dan SQL pada kedua ZIP diuji dengan pemeriksaan berikut. Tidak ada klaim zero bug atau integrasi hosted yang belum dicoba.

## Database dan keamanan

SQL dieksekusi pada PostgreSQL WASM/PGlite. Schema `auth.users`, `auth.uid()`, `storage.objects` dan `storage.buckets` disimulasikan untuk menguji fungsi dan RLS. Ini bukan project Supabase hosted.

| Pengujian | Hasil |
|---|---|
| Pemasangan baru, dua kali installer | Lolos; tidak menggandakan kategori/banner |
| Upgrade schema asli v1, v2, v3 lalu ulang installer | Lolos; produk, stok, banner dan identitas toko dipertahankan |
| Rerun pada data pesanan, metode dan role admin | Lolos; data dipertahankan |
| Rerun pada wallet berisi saldo dan ledger | Lolos; saldo tidak di-reset dan versi migrasi mencapai 4 |
| Harga checkout | Harga berasal dari produk database; harga kiriman browser tidak dijadikan sumber |
| Stok dan retry checkout | Stok habis ditolak; UUID retry tidak menghasilkan pesanan kedua |
| Pengguna lain membaca order/top up/ledger/bukti | Akses ditolak/difilter oleh RLS |
| Pelanggan mengedit role/saldo atau memanggil helper wallet | Ditolak oleh privilege database |
| Identitas anonymous checkout/top up | Ditolak oleh fungsi server |
| Username duplikat beda huruf besar/kecil | Ditolak unique index |
| Top up tanpa bukti atau ACC oleh non-admin | Ditolak |
| Bukti top up dikirim tanpa ACC | Saldo tetap nol |
| Top up ACC dua kali | Kredit masuk sekali; satu ledger kredit |
| Top up ditolak | Alasan wajib; saldo tidak bertambah |
| Izin bukti top up baru dan kedaluwarsa | Status retry/deadline diproses; expired tidak menambah saldo |
| Checkout wallet | Saldo tersedia berkurang dan saldo ditahan bertambah sebesar harga database |
| Wallet checkout kekurangan saldo | Seluruh transaksi rollback; stok tidak ikut berkurang |
| Pembelian saldo ditolak dua kali | Saldo/stok dipulihkan sekali; alasan wajib |
| Pembelian saldo ACC dua kali | Hold ditangkap sekali; saldo tersedia tidak dipotong dua kali; status Diproses, bukan Selesai otomatis |
| Pembatalan pembelian saldo sebelum ACC | Melepas hold dengan aman melalui jalur persetujuan server |
| Bukti manual tepat waktu | Tidak kedaluwarsa saat menunggu admin |
| Admin terlambat memeriksa wallet/manual | Ditandai tindak lanjut; wallet hold tidak otomatis ditolak/dilepas |
| Refund wallet diulang | Kredit refund masuk sekali |
| Invariant ledger | Jumlah delta tersedia/ditahan sama dengan saldo akhir wallet pada skenario uji |
| Akun suspended membuat transaksi | Ditolak |
| Audit status, alasan, admin, waktu dan ledger | Tercatat dalam transaksi database |

Pengujian stok di lingkungan ini bersifat serial; race dua koneksi jaringan nyata tetap perlu diuji pada Supabase hosted.

## Antarmuka dan alur

Pengujian menggunakan jsdom (DOM HTML nyata tanpa layout engine), Supabase SDK mock, dan transport upload mock. Form/route diuji dengan event, bukan screenshot.

| Bagian | Hasil |
|---|---|
| Katalog guest dan setup kosong | Tampil; tersedia pesan konfigurasi |
| Guest memasukkan keranjang | Dialihkan ke Login; keranjang tidak bertambah |
| Register | Metadata username/WhatsApp/terms dikirim; layar verifikasi ditampilkan |
| Login dan lupa password | Form memanggil Auth yang sesuai; error bersifat umum |
| Reset password dengan sesi recovery simulasi | Memanggil update password; tidak menyimpan password di profil |
| Profil / pengaturan profil | Halaman terbuka dan perubahan memakai RPC terbatas |
| Saldo / ledger / transaksi / notifikasi / syarat | Halaman dapat dibuka tanpa exception tak tertangani pada skenario uji |
| Checkout dengan YuuZ Wallet | Mengirim metode wallet, menampilkan hold dan Menunggu ACC |
| Relasi hold one-to-one | Detail dapat membaca object Supabase, bukan mengasumsikan selalu array |
| Top up | Nominal/metode diteruskan, tujuan pembayaran dan form bukti tampil |
| Bukti top up | Preview, progress callback, submit RPC dan Menunggu ACC lolos |
| Galeri 20 screenshot + poster | 21 thumbnail dan navigasi foto dipertahankan |
| Persetujuan Admin | Tab top up/pembelian, halaman filter/pencarian, konfirmasi dan RPC ACC kedua jenis lolos |
| Pelanggan dan ledger Admin | Halaman terbuka; saldo tidak mempunyai form edit langsung |
| Syntax JS/SQL, aset SVG dan path lokal | Diperiksa sebelum pengemasan |
| ZIP | Daftar file dan CRC diperiksa |

Carousel banner menggunakan implementasi clone/delta pointer yang telah diuji pada v3. V4 mempertahankannya dan menggunakan controller yang sama tanpa autoplay untuk galeri utama. Gestur fisik/performa animasi pada perangkat nyata belum diverifikasi.

## Pemeriksaan responsif

Parser CSS dan aturan media query diperiksa pada enam lebar. Angka berikut **bukan ukuran hasil render browser**.

| Viewport | Kolom produk | Perkiraan lebar sel |
|---|---:|---:|
| 320 px | 2 | 143,5 px |
| 360 px | 2 | 158,0 px |
| 390 px | 2 | 173,0 px |
| 768 px | 3 | 226,7 px |
| 1024 px | 4 | 229,0 px |
| 1440 px | 5 | 227,2 px |

Login/register memakai dua kolom di desktop dan layout ringkas mobile. Menu member, wallet, transaksi, tabel admin dan bottom sheet memakai aturan responsif. Label panjang dibungkus; tabel memakai scroll internal. Pemeriksaan aturan tidak membuktikan bebas overflow pada layout engine nyata.

## Batas dan pemeriksaan produksi

Belum diuji pada project milikmu:

- Pengiriman email Auth/SMTP, email confirmation dan tautan reset nyata.
- Login/refresh session melalui layanan Auth hosted.
- Upload Storage HTTP nyata, private signed URL aktual dan upload banyak foto melalui jaringan.
- Pengiriman Realtime hosted dan eksekusi/riwayat job `pg_cron` hosted.
- Render visual Chrome/Edge/Firefox, Android fisik, APK/WebView, file picker, download QRIS dan horizontal overflow terukur.

Sebelum menerima transaksi: konfigurasi Email Auth, SMTP, URL redirect dan password policy; nonaktifkan Anonymous Sign-ins; jalankan SQL; uji register→email→login, top up→bukti→ACC/Tolak, wallet hold→ACC/Tolak, dua browser stok/saldo yang sama, signed URL pihak lain dan expiry saat browser ditutup. Periksa semua halaman pada enam ukuran layar, keyboard, safe area dan gesture.


## Pembaruan V5 — diuji 15 Oktober 2026

LULUS pada PostgreSQL lokal (PGlite), DOM simulasi (jsdom), serta pemeriksaan sintaks dan aturan CSS:

- Seluruh pengujian checkout/harga/stok, penolakan/ACC, private proof ownership, expiry, top up, wallet hold, refund, RLS dan idempotensi dari V4 tetap lulus.
- Notifikasi hanya satu per transaksi setelah beberapa transisi; judul mengikuti status akhir; ID tetap; perubahan baru mereset read_at. Pengguna lain tidak dapat membaca kartu; pembeli tidak dapat mengubah isinya.
- Simulasi migrasi notifikasi lama berulang menjadi satu kartu tanpa menghapus audit. Installer aman dijalankan ulang dan saldo tetap sama. Upgrade v1/v2/v3 ke V5 mempertahankan produk, banner, stok dan identitas toko; pemasangan ulang schema V4/V5 diuji pada alur ledger yang sama.
- QRIS tampil ketika pembayaran pending; tertutup pada menunggu ACC, terverifikasi/diproses, selesai, gagal, batal, kedaluwarsa, batas terlewati dan upload ulang bukti.
- Struk top up berhasil, pembelian wallet, dan pembelian manual tampil setelah ACC; pesanan diproses tidak diberi label sudah selesai.
- Bar pengumuman teratas tidak ada di DOM. Tombol bulan/matahari bekerja di USER dan ADMIN, pilihan tersimpan serta bertahan saat navigasi.
- Semua rute utama USER/ADMIN, dialog ACC, preview/submit bukti dan galeri 20 gambar tetap lulus simulasi tanpa error jsdom yang tidak diharapkan.
- Aturan CSS diperiksa pada 320, 360, 390, 768, 1024 dan 1440 px; sintaks CSS dan JavaScript serta referensi file lokal diperiksa.

Ini bukan klaim bebas bug. Tampilan dan gesture pada browser/perangkat nyata, overflow terukur, layanan Supabase hosted, email, Realtime melalui jaringan, Storage dan Cron produksi masih memerlukan uji pemasangan pada project toko. Tidak tersedia project Supabase produksi untuk diuji dalam pengerjaan ini.


## Pembaruan V6 — diuji ulang 15 Oktober 2026

LULUS:

- Bar pengumuman tidak ada pada DOM USER; sumber render dan style bar dibuang. Form pengaturan ADMIN tidak lagi menawarkan field pengumuman tersebut.
- Tombol tema mengubah ikon, label, aria-pressed, tema dokumen dan meta theme-color. Pilihan tersimpan setelah refresh dan saat navigasi; perubahan melalui storage event juga memperbarui tombol tab lain.
- Semua rute utama USER/ADMIN, login/register/pemulihan, dialog ACC, preview/upload bukti, struk pembayaran serta galeri 20 foto lulus simulasi jsdom tanpa error yang tidak diharapkan.
- Carousel diuji pada simulasi lebar 320/360/390/768/1024/1440: drag ke kanan menggeser track ke kanan; ke kiri menggeser ke kiri; scroll vertikal tidak diambil alih. Batas cloned slide kembali tanpa transisi, navigasi dan cleanup berjalan.
- Sintaks dan aturan CSS diperiksa lagi pada enam lebar yang sama. Aset HTML lokal beserta penanda versi diperiksa menuju file yang ada; JavaScript diperiksa sintaksnya; integritas ZIP diperiksa.
- Seluruh suite PostgreSQL lokal untuk checkout, harga server, stok, private evidence, RLS, ACC ganda, top up, ledger, wallet hold, refund, expiry dan satu notifikasi per transaksi kembali lulus. SQL V6 sama dengan V5.

Batas pengujian tetap berlaku: jsdom menguji perilaku DOM, bukan render visual Chrome/Firefox/Edge atau perangkat Android. Belum ada pengujian Supabase hosted, email/SMTP, Realtime jaringan, Storage nyata, job hosted atau pengukuran overflow browser pada project toko. Tidak ada klaim zero bug.
