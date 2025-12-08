#!/bin/bash
# ============================================
# FREMIO - File Storage Server Setup Script
# VPS 6: Nginx Static File Server
# ============================================

set -e

echo "=========================================="
echo "FREMIO FILE STORAGE SERVER SETUP"
echo "=========================================="

# Update sistem
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
echo "🔧 Installing dependencies..."
apt install -y nginx imagemagick webp

# Buat direktori penyimpanan
echo "📁 Creating storage directories..."
mkdir -p /var/www/storage/uploads/frames
mkdir -p /var/www/storage/uploads/photos
mkdir -p /var/www/storage/uploads/thumbnails
mkdir -p /var/www/storage/uploads/avatars
mkdir -p /var/www/storage/uploads/temp
mkdir -p /var/log/nginx

# Set permissions
chown -R www-data:www-data /var/www/storage
chmod -R 755 /var/www/storage

# Configure Nginx
echo "📝 Configuring Nginx..."
cat > /etc/nginx/nginx.conf << 'NGINX_CONF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

worker_rlimit_nofile 65535;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';

    access_log /var/log/nginx/access.log main buffer=16k flush=2m;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types image/svg+xml;
    # Note: tidak compress images karena sudah compressed

    # Client max body size untuk upload
    client_max_body_size 50M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=static:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    server {
        listen 80;
        server_name _;

        root /var/www/storage;

        # Limit connections
        limit_conn addr 50;

        # Static file serving dengan caching
        location /uploads/ {
            limit_req zone=static burst=200 nodelay;
            
            alias /var/www/storage/uploads/;
            
            # Long cache for images
            expires 30d;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
            
            # CORS headers (untuk akses dari domain lain)
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            
            # Serve webp jika browser support dan file exists
            location ~ ^/uploads/(.+)\.(jpg|jpeg|png)$ {
                set $webp_suffix "";
                if ($http_accept ~* "webp") {
                    set $webp_suffix ".webp";
                }
                try_files /uploads/$1.$2$webp_suffix /uploads/$1.$2 =404;
            }
        }

        # Thumbnails dengan cache lebih lama
        location /uploads/thumbnails/ {
            alias /var/www/storage/uploads/thumbnails/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # Status untuk monitoring
        location /nginx_status {
            stub_status on;
            allow 127.0.0.1;
            deny all;
        }

        # Block access to hidden files
        location ~ /\. {
            deny all;
        }
    }
}
NGINX_CONF

# Create image processing script
echo "📝 Creating image processing scripts..."
cat > /usr/local/bin/process-image.sh << 'PROCESS_IMAGE'
#!/bin/bash
# Process uploaded image: resize, optimize, create thumbnail

INPUT_FILE=$1
OUTPUT_DIR=$2
FILENAME=$3

if [ -z "$INPUT_FILE" ] || [ -z "$OUTPUT_DIR" ] || [ -z "$FILENAME" ]; then
    echo "Usage: $0 <input_file> <output_dir> <filename>"
    exit 1
fi

# Create output directory if not exists
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/../thumbnails"

# Get extension
EXT="${FILENAME##*.}"
BASENAME="${FILENAME%.*}"

# Process main image (max 2000px, quality 85)
convert "$INPUT_FILE" \
    -resize "2000x2000>" \
    -quality 85 \
    -strip \
    "$OUTPUT_DIR/$FILENAME"

# Create WebP version
cwebp -q 85 "$OUTPUT_DIR/$FILENAME" -o "$OUTPUT_DIR/$BASENAME.webp" 2>/dev/null || true

# Create thumbnail (300px)
convert "$INPUT_FILE" \
    -resize "300x300>" \
    -quality 80 \
    -strip \
    "$OUTPUT_DIR/../thumbnails/${BASENAME}_thumb.$EXT"

# Create WebP thumbnail
cwebp -q 80 "$OUTPUT_DIR/../thumbnails/${BASENAME}_thumb.$EXT" -o "$OUTPUT_DIR/../thumbnails/${BASENAME}_thumb.webp" 2>/dev/null || true

echo "Processed: $FILENAME"
PROCESS_IMAGE

chmod +x /usr/local/bin/process-image.sh

# Create cleanup script
cat > /usr/local/bin/cleanup-temp.sh << 'CLEANUP'
#!/bin/bash
# Cleanup temporary files older than 1 hour

find /var/www/storage/uploads/temp -type f -mmin +60 -delete
find /var/www/storage/uploads -name "*.tmp" -mmin +60 -delete

echo "$(date): Cleanup completed" >> /var/log/storage-cleanup.log
CLEANUP

chmod +x /usr/local/bin/cleanup-temp.sh

# Add cleanup to cron (every hour)
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/cleanup-temp.sh") | crontab -

# Create disk usage alert script
cat > /usr/local/bin/disk-alert.sh << 'DISK_ALERT'
#!/bin/bash
# Alert if disk usage > 80%

USAGE=$(df /var/www/storage | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt 80 ]; then
    echo "$(date): WARNING - Disk usage at ${USAGE}%" >> /var/log/disk-alert.log
    # Tambahkan notifikasi (email, webhook, dll) di sini
fi
DISK_ALERT

chmod +x /usr/local/bin/disk-alert.sh

# Add disk alert to cron (every 6 hours)
(crontab -l 2>/dev/null; echo "0 */6 * * * /usr/local/bin/disk-alert.sh") | crontab -

# Setup firewall
echo "🔒 Setting up firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
# HTTP dari Load Balancer saja (update IP nanti)
ufw allow from LOAD_BALANCER_IP to any port 80
# Untuk internal upload dari App Servers
ufw allow from APP_SERVER_1_IP to any port 80
ufw allow from APP_SERVER_2_IP to any port 80
ufw allow from APP_SERVER_3_IP to any port 80
ufw --force enable

# Create script untuk update firewall IPs
cat > /root/update-firewall-ips.sh << 'UPDATE_FW'
#!/bin/bash
# Update firewall dengan IP yang benar

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <LOAD_BALANCER_IP> <APP1_IP> <APP2_IP> <APP3_IP>"
    exit 1
fi

LB_IP=$1
APP1=$2
APP2=$3
APP3=$4

# Reset firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh

# Allow dari Load Balancer
ufw allow from $LB_IP to any port 80

# Allow dari App Servers (untuk upload)
ufw allow from $APP1 to any port 80
ufw allow from $APP2 to any port 80
ufw allow from $APP3 to any port 80

ufw --force enable

echo "✅ Firewall updated successfully!"
UPDATE_FW

chmod +x /root/update-firewall-ips.sh

# Create sync script (untuk backup ke server lain jika perlu)
cat > /root/sync-storage.sh << 'SYNC_SCRIPT'
#!/bin/bash
# Sync storage ke backup server

BACKUP_SERVER="backup@BACKUP_SERVER_IP"
RSYNC_OPTS="-avz --delete"

rsync $RSYNC_OPTS /var/www/storage/uploads/ $BACKUP_SERVER:/var/www/storage/uploads/

echo "$(date): Sync completed" >> /var/log/storage-sync.log
SYNC_SCRIPT

chmod +x /root/sync-storage.sh

# Enable dan start nginx
systemctl enable nginx
systemctl start nginx

# Setup logrotate
cat > /etc/logrotate.d/storage << 'LOGROTATE'
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
LOGROTATE

echo ""
echo "=========================================="
echo "✅ FILE STORAGE SERVER SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "STRUKTUR DIREKTORI:"
echo "/var/www/storage/"
echo "├── uploads/"
echo "│   ├── frames/      # Frame images"
echo "│   ├── photos/      # User photos"
echo "│   ├── thumbnails/  # Image thumbnails"
echo "│   ├── avatars/     # User avatars"
echo "│   └── temp/        # Temporary files"
echo ""
echo "LANGKAH SELANJUTNYA:"
echo ""
echo "1. Update firewall dengan IP yang benar:"
echo "   /root/update-firewall-ips.sh <LB_IP> <APP1_IP> <APP2_IP> <APP3_IP>"
echo ""
echo "2. Upload existing frames ke /var/www/storage/uploads/frames/"
echo ""
echo "3. Test akses:"
echo "   curl http://localhost/health"
echo "   curl http://localhost/uploads/frames/test.jpg"
echo ""
echo "4. URL untuk akses file:"
echo "   http://<THIS_SERVER_IP>/uploads/frames/filename.jpg"
echo ""
