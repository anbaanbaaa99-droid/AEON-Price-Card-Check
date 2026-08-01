# AEON Price Card Check

Web app untuk pengecekan price card dengan:

- Input tanggal, jam, gondola/area, Check By, hasil, dan keterangan.
- Foto bukti dan lokasi GPS opsional.
- Approval digital berurutan: **PIC → AGL → GL**.
- Konfirmasi PIN di setiap tahap.
- Audit trail: akun, peran, waktu server, perangkat, catatan, foto, dan lokasi.
- Dashboard, riwayat, filter, detail approval, dan export CSV.
- Tampilan responsif serta dapat dipasang sebagai PWA di ponsel.
- Backend Google Apps Script + Google Sheet.
- Frontend statis untuk GitHub Pages.

## Mengapa tidak memakai gambar tanda tangan?

Gambar TTD mudah disalin dan tidak selalu membuktikan siapa yang benar-benar melakukan approval. Paket ini menggunakan:

1. akun personal,
2. PIN 6 digit yang divalidasi backend,
3. timestamp dari server,
4. urutan approval,
5. audit log,
6. foto bukti,
7. lokasi GPS opsional,
8. informasi perangkat.

Untuk kebutuhan internal operasional, kombinasi ini biasanya lebih kuat dan lebih mudah diaudit daripada sekadar gambar TTD. Pastikan kebijakan ini disetujui manajemen perusahaan.

---

# Struktur Folder

```text
aeon_price_card_check/
├─ backend_apps_script/
│  ├─ Code.gs
│  └─ appsscript.json
└─ frontend/
   ├─ index.html
   ├─ styles.css
   ├─ app.js
   ├─ config.js
   ├─ manifest.json
   ├─ service-worker.js
   └─ assets/
      ├─ icon-192.png
      └─ icon-512.png
```

# A. Setup Backend Google Apps Script

## 1. Buat Google Sheet

Buat Google Sheet baru, misalnya bernama:

`AEON Price Card Check Database`

## 2. Buka Apps Script

Dari Google Sheet:

`Extensions → Apps Script`

## 3. Masukkan backend

- Hapus isi `Code.gs`.
- Salin seluruh isi file `backend_apps_script/Code.gs`.
- Pada **Project Settings**, pastikan timezone `Asia/Jakarta`.

File `appsscript.json` disediakan sebagai referensi. Untuk menampilkannya di Apps Script, aktifkan **Show appsscript.json manifest file** pada Project Settings.

## 4. Jalankan setup

Pada dropdown fungsi, pilih:

```javascript
setupSystem
```

Klik **Run**, lalu izinkan akses Google Sheet dan Google Drive.

Sistem otomatis membuat sheet:

- `USERS`
- `GONDOLAS`
- `CHECKS`
- `LOGS`
- `SESSIONS`

Sistem juga membuat folder Google Drive:

`AEON Price Card Evidence`

## 5. Akun demo

| Role | User ID | PIN |
|---|---|---|
| PIC | PIC001 | 123456 |
| AGL | AGL001 | 123456 |
| GL | GL001 | 123456 |

**Wajib ganti PIN demo sebelum penggunaan operasional.**

Contoh dari Apps Script editor:

```javascript
resetUserPin("PIC001", "654321");
resetUserPin("AGL001", "234567");
resetUserPin("GL001", "345678");
```

## 6. Tambahkan user nyata

Jalankan dari editor Apps Script:

```javascript
addUser("PIC002", "Nama PIC", "PIC", "123456", "pic@contoh.com");
addUser("AGL002", "Nama AGL", "AGL", "123456", "agl@contoh.com");
addUser("GL002", "Nama GL", "GL", "123456", "gl@contoh.com");
```

Role hanya boleh:

- `PIC`
- `AGL`
- `GL`

## 7. Atur gondola

Anda dapat mengedit langsung sheet `GONDOLAS`, atau memakai fungsi:

```javascript
addGondola("GON-009", "Gondola 09", "Food");
```

Kolom `active` harus bernilai `TRUE` agar tampil di aplikasi.

## 8. Deploy Web App

Pada Apps Script:

1. Klik **Deploy → New deployment**.
2. Pilih type **Web app**.
3. Description: `AEON Price Card API v1`.
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Klik **Deploy**.
7. Salin URL berakhiran `/exec`.

> Jangan gunakan URL `/dev`.

# B. Setup Frontend GitHub Pages

## 1. Isi URL backend

Buka:

`frontend/config.js`

Ganti:

```javascript
API_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

menjadi URL `/exec` dari Apps Script.

## 2. Upload ke GitHub

- Buat repository baru.
- Upload **isi folder `frontend`**, bukan folder induknya.
- Commit.

## 3. Aktifkan GitHub Pages

- Buka `Settings → Pages`.
- Source: `Deploy from a branch`.
- Branch: `main`.
- Folder: `/root`.
- Save.

Tunggu hingga URL GitHub Pages muncul.

# C. Alur Penggunaan

## PIC

1. Login.
2. Buka **Input Pengecekan**.
3. Pilih tanggal, jam, dan gondola.
4. Pilih hasil pengecekan.
5. Isi keterangan.
6. Tambah foto dan lokasi bila diperlukan.
7. Masukkan PIN.
8. Klik **Simpan & Ajukan ke AGL**.

Submit PIC otomatis tercatat sebagai persetujuan digital PIC.

## AGL

1. Login sebagai AGL.
2. Buka menu **Persetujuan**.
3. Periksa detail, foto, dan lokasi.
4. Masukkan PIN.
5. Setujui atau tolak.

## GL

1. Login sebagai GL.
2. Buka menu **Persetujuan**.
3. Data yang sudah disetujui AGL akan tampil.
4. Masukkan PIN.
5. Setujui sebagai final approval atau tolak.

# D. Sheet dan Fungsinya

## USERS

Master akun dan role. PIN tidak disimpan dalam bentuk asli, tetapi sebagai SHA-256 hash.

## GONDOLAS

Master area pengecekan.

## CHECKS

Data utama pengecekan dan seluruh tahap approval.

## LOGS

Audit trail aktivitas.

## SESSIONS

Token login yang aktif selama 12 jam.

# E. Catatan Keamanan

- Ganti seluruh PIN demo.
- Jangan membagikan URL Google Sheet kepada pengguna biasa.
- Berikan hak edit Google Sheet hanya kepada admin.
- Backend memang di-deploy untuk `Anyone` agar frontend GitHub dapat mengaksesnya, tetapi setiap action tetap memerlukan token sesi dan validasi role.
- Untuk kebijakan lebih ketat, tahap berikutnya dapat memakai Google Workspace login, allowlist domain perusahaan, OTP email, atau Firebase Authentication.
- File foto saat ini disetel `Anyone with the link` agar dapat dibuka dari frontend. Ubah bagian `file.setSharing(...)` bila kebijakan perusahaan melarang tautan publik.
- Persetujuan digital ini adalah kontrol operasional internal, bukan pengganti tanda tangan elektronik tersertifikasi untuk kontrak atau dokumen hukum.

# F. Troubleshooting

## Login gagal setelah setup

Pastikan:

- `setupSystem()` sudah dijalankan.
- Sheet `USERS` sudah berisi akun.
- Deployment Apps Script adalah versi terbaru.
- URL pada `config.js` berakhiran `/exec`.

## Perubahan backend tidak muncul

Setelah mengubah Apps Script:

1. `Deploy → Manage deployments`.
2. Klik ikon edit.
3. Pilih **New version**.
4. Deploy.

## Foto gagal diupload

- Pastikan ukuran di bawah 1,5 MB.
- Pastikan izin Google Drive diberikan saat menjalankan setup.
- Pastikan tipe file berupa JPG, PNG, atau format gambar lain.

## Data tidak muncul di GitHub Pages

- Buka Developer Tools browser.
- Periksa Console.
- Pastikan URL `config.js` benar.
- Pastikan Apps Script deployment memakai akses `Anyone`.

# G. Pengembangan Lanjutan yang Disarankan

- QR code per gondola agar PIC cukup scan.
- Jadwal pengecekan dan notifikasi keterlambatan.
- Rekap per shift dan per departemen.
- Dashboard compliance per area.
- Temuan dengan status tindak lanjut.
- WhatsApp/email notification ke AGL dan GL.
- Google Workspace SSO.
- Admin panel untuk user dan gondola.
