#!/bin/bash
# ============================================
# FREMIO - App Server Setup Script
# VPS 2,3,4: Node.js + PM2 Cluster
# ============================================

set -e

echo "=========================================="
echo "FREMIO APP SERVER SETUP"
echo "=========================================="

# Update sistem
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
echo "🔧 Installing dependencies..."
apt install -y curl git build-essential

# Install Node.js 20 LTS
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 globally
echo "🚀 Installing PM2..."
npm install -g pm2

# Buat user untuk aplikasi
echo "👤 Creating application user..."
useradd -m -s /bin/bash fremio || true
mkdir -p /home/fremio/app
mkdir -p /home/fremio/logs
mkdir -p /home/fremio/uploads

# Buat direktori aplikasi
echo "📁 Creating application directories..."
mkdir -p /var/www/fremio-backend
mkdir -p /var/www/fremio-backend/logs
mkdir -p /var/www/fremio-backend/uploads

# Buat file .env template
echo "📝 Creating environment configuration..."
cat > /var/www/fremio-backend/.env << 'ENV_FILE'
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (Ganti dengan IP VPS Database)
DATABASE_URL=postgresql://fremio_user:YOUR_STRONG_PASSWORD@DATABASE_VPS_IP:5432/fremio_db

# Redis Configuration (Ganti dengan IP VPS Database)
REDIS_URL=redis://DATABASE_VPS_IP:6379

# JWT Secret (Ganti dengan secret yang kuat)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# File Storage Configuration (Ganti dengan IP VPS File Storage)
FILE_STORAGE_URL=http://FILE_STORAGE_IP/uploads
FILE_STORAGE_PATH=/var/www/fremio-backend/uploads

# CORS Configuration
CORS_ORIGIN=https://YOUR_DOMAIN

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Upload Configuration
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Firebase (jika menggunakan Firebase Auth)
# FIREBASE_PROJECT_ID=your-firebase-project
# FIREBASE_PRIVATE_KEY_ID=your-key-id
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
# FIREBASE_CLIENT_ID=your-client-id

# Supabase (jika menggunakan Supabase)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-supabase-anon-key
ENV_FILE

# Buat PM2 ecosystem configuration
echo "📝 Creating PM2 ecosystem configuration..."
cat > /var/www/fremio-backend/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'fremio-api',
    script: 'server.js',
    cwd: '/var/www/fremio-backend',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: '/var/www/fremio-backend/logs/combined.log',
    out_file: '/var/www/fremio-backend/logs/out.log',
    error_file: '/var/www/fremio-backend/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Performance
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
    
    // Auto restart
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
    
    // Health monitoring
    exp_backoff_restart_delay: 100
  }]
};
PM2_CONFIG

# Buat script untuk update konfigurasi
cat > /root/update-config.sh << 'UPDATE_SCRIPT'
#!/bin/bash
# Script untuk update konfigurasi

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <DATABASE_IP> <FILE_STORAGE_IP> <DOMAIN> <DB_PASSWORD>"
    exit 1
fi

DB_IP=$1
STORAGE_IP=$2
DOMAIN=$3
DB_PASS=$4

cd /var/www/fremio-backend

sed -i "s/DATABASE_VPS_IP/$DB_IP/g" .env
sed -i "s/FILE_STORAGE_IP/$STORAGE_IP/g" .env
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" .env
sed -i "s/YOUR_STRONG_PASSWORD/$DB_PASS/g" .env

# Generate JWT secret jika belum ada
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
sed -i "s/your-super-secret-jwt-key-minimum-32-characters-long/$JWT_SECRET/g" .env

echo "✅ Configuration updated successfully!"
echo "JWT_SECRET: $JWT_SECRET"
echo "Simpan JWT_SECRET ini! Harus sama di semua app server."
UPDATE_SCRIPT

chmod +x /root/update-config.sh

# Setup logrotate
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/fremio << 'LOGROTATE'
/var/www/fremio-backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
LOGROTATE

# Setup firewall
echo "🔒 Setting up firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow from LOAD_BALANCER_IP to any port 3000  # Ganti dengan IP Load Balancer
ufw --force enable

# Setup PM2 startup
pm2 startup systemd -u root --hp /root
pm2 save

# Create health check script
cat > /root/health-check.sh << 'HEALTH_SCRIPT'
#!/bin/bash
# Health check script

response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$response" != "200" ]; then
    echo "$(date): Health check failed with status $response" >> /var/log/fremio-health.log
    pm2 restart fremio-api
fi
HEALTH_SCRIPT

chmod +x /root/health-check.sh

# Add health check to cron (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/health-check.sh") | crontab -

echo ""
echo "=========================================="
echo "✅ APP SERVER SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "LANGKAH SELANJUTNYA:"
echo ""
echo "1. Upload backend files ke /var/www/fremio-backend/"
echo "   scp -r backend/* user@this-server:/var/www/fremio-backend/"
echo ""
echo "2. Update konfigurasi:"
echo "   /root/update-config.sh <DB_IP> <STORAGE_IP> <DOMAIN> <DB_PASSWORD>"
echo ""
echo "3. Install dependencies:"
echo "   cd /var/www/fremio-backend && npm install --production"
echo ""
echo "4. Update firewall dengan IP Load Balancer:"
echo "   ufw allow from <LOAD_BALANCER_IP> to any port 3000"
echo ""
echo "5. Start aplikasi:"
echo "   cd /var/www/fremio-backend && pm2 start ecosystem.config.js"
echo "   pm2 save"
echo ""
echo "6. Monitor aplikasi:"
echo "   pm2 monit"
echo "   pm2 logs"
echo ""
