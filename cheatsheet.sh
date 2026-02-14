#!/bin/bash

# ================================================================
# FREMIO - COMMAND CHEAT SHEET
# ================================================================
# Quick reference untuk command-command penting
# ================================================================

cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                  📚 FREMIO COMMAND CHEAT SHEET 📚                ║
╚══════════════════════════════════════════════════════════════════╝

🌐 SERVER INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server:     76.13.192.32
  SSH:        ssh root@76.13.192.32
  Frontend:   http://76.13.192.32
  API:        http://76.13.192.32/api


🚀 DEPLOYMENT COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Quick Deploy:        ./quick-deploy.sh
  Prepare ENV:         ./prepare-env-files.sh
  Clean Server:        ./clean-new-server.sh
  Deploy App:          ./deploy-to-new-server.sh
  Monitor:             ./monitor-server.sh


📊 MONITORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server Status:       ./monitor-server.sh
  PM2 Status:          ssh root@76.13.192.32 'pm2 status'
  PM2 Logs:            ssh root@76.13.192.32 'pm2 logs fremio-api'
  Nginx Status:        ssh root@76.13.192.32 'systemctl status nginx'
  DB Status:           ssh root@76.13.192.32 'systemctl status postgresql'


🔧 SERVICE MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Restart Backend:     ssh root@76.13.192.32 'pm2 restart fremio-api'
  Restart Nginx:       ssh root@76.13.192.32 'systemctl restart nginx'
  Restart DB:          ssh root@76.13.192.32 'systemctl restart postgresql'
  Restart All:         ssh root@76.13.192.32 'pm2 restart all && systemctl restart nginx'


📝 LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PM2 Logs (live):     ssh root@76.13.192.32 'pm2 logs fremio-api'
  PM2 Logs (last 50):  ssh root@76.13.192.32 'pm2 logs fremio-api --lines 50 --nostream'
  Nginx Error:         ssh root@76.13.192.32 'tail -f /var/log/nginx/error.log'
  Nginx Access:        ssh root@76.13.192.32 'tail -f /var/log/nginx/access.log'
  Clear Logs:          ssh root@76.13.192.32 'pm2 flush'


🗄️ DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Connect:             ssh root@76.13.192.32 'sudo -u postgres psql fremio'
  Backup:              ssh root@76.13.192.32 'sudo -u postgres pg_dump fremio > backup.sql'
  List Tables:         \dt
  Count Users:         SELECT COUNT(*) FROM users;
  Exit:                \q


🧪 TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  API Health:          curl http://76.13.192.32/api/health
  Frontend:            open http://76.13.192.32
  Check Ports:         ssh root@76.13.192.32 'netstat -tulpn | grep -E "80|443|5050"'


🔐 SECURITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Firewall Status:     ssh root@76.13.192.32 'ufw status'
  Add Firewall Rule:   ssh root@76.13.192.32 'ufw allow PORT/tcp'
  View ENV (backend):  ssh root@76.13.192.32 'cat /var/www/fremio/backend/.env'


📦 UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Update System:       ssh root@76.13.192.32 'apt-get update && apt-get upgrade -y'
  Update Backend:      rsync -avz backend/ root@76.13.192.32:/var/www/fremio/backend/ && ssh root@76.13.192.32 'cd /var/www/fremio/backend && npm install && pm2 restart fremio-api'
  Update Frontend:     npm run build && rsync -avz my-app/dist/ root@76.13.192.32:/var/www/fremio/frontend/


💾 BACKUP & RESTORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Full Backup:         ssh root@76.13.192.32 'cd /var/www/fremio && sudo -u postgres pg_dump fremio > db_backup.sql && tar -czf backup_$(date +%Y%m%d).tar.gz backend/ frontend/ uploads/ db_backup.sql'
  Download Backup:     scp root@76.13.192.32:/var/www/fremio/backup_*.tar.gz ./
  Restore DB:          ssh root@76.13.192.32 'sudo -u postgres psql fremio < backup.sql'


🔍 DEBUGGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Check Disk Space:    ssh root@76.13.192.32 'df -h'
  Check Memory:        ssh root@76.13.192.32 'free -h'
  Check CPU:           ssh root@76.13.192.32 'top -bn1 | head -20'
  Check Processes:     ssh root@76.13.192.32 'ps aux | grep node'
  Test Nginx Config:   ssh root@76.13.192.32 'nginx -t'


🌐 SSL & DOMAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Install Certbot:     ssh root@76.13.192.32 'apt-get install -y certbot python3-certbot-nginx'
  Get SSL:             ssh root@76.13.192.32 'certbot --nginx -d fremio.id -d www.fremio.id'
  Renew SSL:           ssh root@76.13.192.32 'certbot renew'
  Test Auto-renew:     ssh root@76.13.192.32 'certbot renew --dry-run'


📁 FILE LOCATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Backend:             /var/www/fremio/backend/
  Frontend:            /var/www/fremio/frontend/
  Uploads:             /var/www/fremio/uploads/
  Logs:                /var/www/fremio/logs/
  Nginx Config:        /etc/nginx/sites-available/fremio
  PM2 Config:          /var/www/fremio/ecosystem.config.js
  Backend ENV:         /var/www/fremio/backend/.env


🆘 EMERGENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Kill All Node:       ssh root@76.13.192.32 'pkill -9 node'
  Restart Everything:  ssh root@76.13.192.32 'pm2 restart all && systemctl restart nginx && systemctl restart postgresql'
  Check Service:       ssh root@76.13.192.32 'systemctl status nginx postgresql'


📞 QUICK FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  500 Error:           Check PM2 logs → ssh root@76.13.192.32 'pm2 logs fremio-api --lines 100'
  502 Bad Gateway:     Restart backend → ssh root@76.13.192.32 'pm2 restart fremio-api'
  Upload Error:        Fix permissions → ssh root@76.13.192.32 'chmod 775 /var/www/fremio/uploads && chown -R www-data:www-data /var/www/fremio/uploads'
  DB Connection:       Check .env DB_PASSWORD → ssh root@76.13.192.32 'grep DB_PASSWORD /var/www/fremio/backend/.env'


💡 TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Always backup before major changes
  • Monitor logs after deployment
  • Test payment in sandbox first
  • Keep .db_credentials file safe
  • Update system packages weekly
  • Setup automated backups


📚 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Full Guide:          DEPLOYMENT_NEW_SERVER.md
  Quick Start:         QUICK_DEPLOY_README.md
  Summary:             DEPLOYMENT_SUMMARY.md
  This Cheatsheet:     ./cheatsheet.sh


═══════════════════════════════════════════════════════════════════

💡 Save this for quick reference!

To print this again, run: ./cheatsheet.sh

EOF
