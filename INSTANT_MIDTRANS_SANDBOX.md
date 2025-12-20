# Instant Midtrans Sandbox (Localhost + Server)

Tujuan: frontend jalan di localhost, tapi transaksi Midtrans Sandbox dan webhook jalan di server publik.

## 1) Webhook Midtrans (sudah kamu set)
- Midtrans Sandbox → Settings → Payment Notification URL
- Set ke: `https://api.fremio.id/api/payment/webhook` (atau domain backend kamu)

## 2) Setup instan backend + frontend
Jalankan dari root repo:

```bash
bash scripts/instant-midtrans-sandbox.sh
```

Script ini akan:
- Membuat `my-app/.env.local` (untuk Snap Sandbox + Vite proxy ke backend server)
- Meng-update `MIDTRANS_*` + `FRONTEND_URL` pada `/var/www/fremio-backend/.env` di server
- Restart PM2 process `fremio-api` (default)

## 3) Jalankan frontend localhost

```bash
cd my-app
npm install
npm run dev
```

## 4) Verifikasi cepat
- Backend health: `curl -s https://api.fremio.id/health`
- Log webhook/payment: `ssh root@72.61.210.203 'pm2 logs fremio-api --lines 100 --nostream'`

## Catatan penting
- Jangan pernah commit `.env.local` atau `.env` berisi key.
- Kalau server `api.fremio.id` dipakai production juga, pastikan ini benar-benar server staging sebelum mengganti Midtrans keys.
