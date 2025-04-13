#!/bin/bash

# Verification script to troubleshoot 403 errors
echo "===== Nginx Configuration Verification ====="

# Check if nginx is running
echo "Checking nginx status..."
sudo systemctl status nginx | grep Active

# Check nginx configuration
echo "Verifying nginx configuration..."
sudo nginx -t

# Check site configuration
echo "Checking sites-enabled configuration..."
ls -la /etc/nginx/sites-enabled/

# Check permissions
echo "Checking directory permissions..."
ls -la /var/www/
ls -la /var/www/assets_extractor/
ls -la /var/www/assets_extractor/frontend/

# Check if nginx user can access files
echo "Testing nginx user access..."
sudo -u www-data ls -la /var/www/assets_extractor/frontend/

# Check nginx logs
echo "Checking nginx error log..."
sudo tail -n 20 /var/log/nginx/error.log

echo "Checking asset-extractor error log..."
sudo tail -n 20 /var/log/nginx/assets-extractor-error.log

# Check backend status
echo "Checking backend service status..."
sudo systemctl status assets-extractor | grep Active

# Print helpful information
echo
echo "===== Troubleshooting Tips ====="
echo "1. If permissions show errors, run: sudo chmod -R 755 /var/www/assets_extractor"
echo "2. If index.html is not found, check that the frontend build was copied correctly"
echo "3. Make sure nginx has been restarted: sudo systemctl restart nginx"
echo "4. Check backend service: sudo journalctl -u assets-extractor -f"

echo
echo "===== Quick Fix Command ====="
echo "sudo bash -c 'chown -R www-data:www-data /var/www/assets_extractor && systemctl restart nginx'"
