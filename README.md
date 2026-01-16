# GOWA Dashboard

Dashboard ini adalah UI untuk mengelola GOWA (Go WhatsApp API) berbasis REST, dibangun dengan:

- Vite
- React + TypeScript
- Tailwind CSS
- shadcn-ui

Dokumen ini menjelaskan cara instalasi, konfigurasi environment, dan cara menjalankan project dengan benar.

## 1. Prasyarat

- Node.js dan npm terpasang di komputer
- Akses ke server GOWA (REST mode) yang sudah berjalan

## 2. Instalasi

Jalankan di root project:

```bash
npm install
```

Jika ada peringatan vulnerability, Anda bisa cek dengan:

```bash
npm audit
```

## 3. Script npm yang tersedia

Script utama yang bisa digunakan:

- `npm run dev` – Menjalankan development server
- `npm run build` – Build untuk production
- `npm run preview` – Preview hasil build
- `npm run lint` – Menjalankan eslint
- `npm test` – Menjalankan test (vitest)

Catatan penting:

- Tidak ada script `server`
- Tidak ada script `start`

Jadi, perintah seperti:

- `npm run server`
- `npm start`

akan error dengan pesan “Missing script” karena memang tidak didefinisikan di `package.json`.

Untuk pengembangan, gunakan:

```bash
npm run dev
```

Setelah itu buka URL yang tampil di terminal, biasanya:

```text
http://localhost:8080/
```

## 4. Konfigurasi Environment (.env)

Dashboard ini menggunakan environment variable pendek dan bersih, langsung diakses di sisi client.

Buat file `.env` di root project dan isi minimal seperti berikut:

```bash
API_URL=http://192.168.18.50:3003
```

Penjelasan:

– `API_URL`  
  Base URL server GOWA (contoh: `http://192.168.18.50:3003`)

## 5. Integrasi ke GOWA API

Semua request HTTP menggunakan instance axios global yang:

- Menggunakan `API_URL` sebagai `baseURL`

Beberapa endpoint utama yang digunakan:

- `GET /devices` – daftar device, auto-select device pertama jika ada
- `GET /chats` – menampilkan daftar chat
- `POST /send/message` – kirim pesan teks sederhana
- `POST /group` – membuat grup baru

Detail lengkap struktur payload mengikuti spesifikasi resmi GOWA openapi.

## 7. Build untuk Production

Untuk build dan preview:

```bash
npm run build
npm run preview
```

Server preview akan berjalan di port default Vite preview, dan dapat diakses lewat URL yang ditampilkan di terminal.

## 8. Ringkasan Error Umum

Jika Anda melihat error seperti:

```text
npm run server
npm error Missing script: "server"
```

atau

```text
npm start
npm error Missing script: "start"
```

itu normal karena script tersebut memang tidak ada. Gunakan `npm run dev` untuk development, atau `npm run build` dan `npm run preview` untuk mode production/preview.
