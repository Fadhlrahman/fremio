const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const DEV_DEBUG_TOKEN = process.env.DEV_DEBUG_TOKEN || '031111';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT, timestamp: new Date().toISOString() });
});

app.post('/api/dev/debug-auth', (req, res) => {
  const token = req.body?.token;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token tidak ditemukan pada request.' });
  }

  if (token !== DEV_DEBUG_TOKEN) {
    return res.status(401).json({ success: false, error: 'Token developer tidak valid.' });
  }

  console.log(`✅ Developer debug diaktifkan menggunakan token ${token}`);
  return res.json({ success: true, message: 'Developer debug mode granted.' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Fremio backend berjalan di http://localhost:${PORT}`);
});
