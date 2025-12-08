#!/bin/bash
# ============================================
# FREMIO - Load Balancer Setup Script
# VPS 1: Nginx Load Balancer + SSL
# ============================================

set -e

echo "=========================================="
echo "FREMIO LOAD BALANCER SETUP"
echo "=========================================="

# Update sistem
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Nginx
echo "🔧 Installing Nginx..."
apt install -y nginx certbot python3-certbot-nginx

# Buat direktori
mkdir -p /var/log/nginx
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Buat konfigurasi nginx untuk load balancer
echo "📝 Creating Nginx configuration..."
cat > /etc/nginx/nginx.conf << 'NGINX_CONF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

# Optimisasi untuk high traffic
worker_rlimit_nofile 65535;

events {
    worker_connections 65535;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main buffer=16k flush=2m;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/rss+xml application/atom+xml image/svg+xml;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Connection limits
    limit_conn addr 100;

    # Upstream untuk App Servers (Ganti IP sesuai VPS Anda)
    upstream backend_servers {
        least_conn;
        
        server APP_SERVER_1_IP:3000 weight=1 max_fails=3 fail_timeout=30s;
        server APP_SERVER_2_IP:3000 weight=1 max_fails=3 fail_timeout=30s;
        server APP_SERVER_3_IP:3000 weight=1 max_fails=3 fail_timeout=30s;

        keepalive 64;
    }

    # Upstream untuk File Storage
    upstream file_storage {
        server FILE_STORAGE_IP:80 weight=1;
        keepalive 32;
    }

    # Redirect HTTP ke HTTPS
    server {
        listen 80;
        server_name YOUR_DOMAIN www.YOUR_DOMAIN;
        
        location /.well-known/acme-challenge/ {
            root /var/www/html;
        }
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # Main HTTPS Server
    server {
        listen 443 ssl http2;
        server_name YOUR_DOMAIN www.YOUR_DOMAIN;

        # SSL Configuration (akan di-setup oleh certbot)
        ssl_certificate /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Client max body size untuk upload
        client_max_body_size 50M;

        # Frontend static files (dari build React)
        root /var/www/fremio/dist;
        index index.html;

        # Serve static frontend files
        location / {
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API requests ke backend
        location /api/ {
            limit_req zone=api burst=50 nodelay;
            
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth endpoints dengan rate limit lebih ketat
        location /api/auth/ {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Upload endpoints
        location /api/upload/ {
            limit_req zone=upload burst=5 nodelay;
            client_max_body_size 50M;
            
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Longer timeout for uploads
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Static files dari file storage
        location /uploads/ {
            proxy_pass http://file_storage;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            
            # Cache files
            proxy_cache_valid 200 1d;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # Nginx status (untuk monitoring)
        location /nginx_status {
            stub_status on;
            allow 127.0.0.1;
            deny all;
        }
    }
}
NGINX_CONF

# Buat direktori untuk frontend
mkdir -p /var/www/fremio/dist
mkdir -p /var/www/html

# Buat script untuk update IP
cat > /root/update-servers.sh << 'UPDATE_SCRIPT'
#!/bin/bash
# Script untuk update IP server

if [ "$#" -ne 5 ]; then
    echo "Usage: $0 <APP_SERVER_1_IP> <APP_SERVER_2_IP> <APP_SERVER_3_IP> <FILE_STORAGE_IP> <YOUR_DOMAIN>"
    exit 1
fi

APP1=$1
APP2=$2
APP3=$3
STORAGE=$4
DOMAIN=$5

sed -i "s/APP_SERVER_1_IP/$APP1/g" /etc/nginx/nginx.conf
sed -i "s/APP_SERVER_2_IP/$APP2/g" /etc/nginx/nginx.conf
sed -i "s/APP_SERVER_3_IP/$APP3/g" /etc/nginx/nginx.conf
sed -i "s/FILE_STORAGE_IP/$STORAGE/g" /etc/nginx/nginx.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/nginx.conf

nginx -t && systemctl reload nginx
echo "✅ Server IPs updated successfully!"
UPDATE_SCRIPT

chmod +x /root/update-servers.sh

# Setup firewall
echo "🔒 Setting up firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Enable dan start nginx
systemctl enable nginx
systemctl start nginx

# Setup auto-renewal untuk SSL
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

echo ""
echo "=========================================="
echo "✅ LOAD BALANCER SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "LANGKAH SELANJUTNYA:"
echo "1. Update IP servers dengan menjalankan:"
echo "   /root/update-servers.sh <APP1_IP> <APP2_IP> <APP3_IP> <STORAGE_IP> <DOMAIN>"
echo ""
echo "2. Upload frontend build ke /var/www/fremio/dist"
echo ""
echo "3. Setup SSL dengan certbot:"
echo "   certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "4. Test konfigurasi:"
echo "   nginx -t"
echo "   systemctl restart nginx"
echo ""
