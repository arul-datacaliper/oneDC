# OneDC Development Server Deployment Guide
# VM IP: 135.233.176.35

## 🚀 Quick Start for Development Deployment

### Step 1: Configure Database Connection

Update the database host address in the development configuration:

**File: `backend/OneDc.Api/appsettings.Development.Server.json`**
```json
{
  "ConnectionStrings": {
    "OneDcDb": "Host=YOUR_ACTUAL_DB_HOST_ADDRESS;Database=onedc_development;Username=onedc_user;Password=OneDC_Dev_2025!;SSL Mode=Prefer"
  }
}
```

Replace `YOUR_ACTUAL_DB_HOST_ADDRESS` with the database host provided by your infra team.

### Step 2: Build and Deploy (Local Machine)

```bash
# Navigate to your project
cd /Users/arul/oneDC/oneDC

# 1. Update database host in appsettings.Development.Server.json
# 2. Build backend for development server
cd backend && ../scripts/deploy-backend-dev.sh

# 3. Build frontend for development server  
cd ../frontend/onedc && ../../scripts/deploy-frontend-dev.sh
```

### Step 3: Upload to Development Server

```bash
# Upload backend
scp backend/onedc-backend-dev.tar.gz username@135.233.176.35:~/

# Upload frontend
scp frontend/onedc/dist/onedc-frontend-dev.tar.gz username@135.233.176.35:~/
```

### Step 4: Setup Development Server (On VM)

```bash
# Connect to VM
ssh username@135.233.176.35

# Install prerequisites (if not already done)
sudo apt update && sudo apt upgrade -y
sudo apt install -y aspnetcore-runtime-9.0 postgresql postgresql-contrib nginx

# Create application directories
sudo mkdir -p /var/www/onedc-api /var/www/onedc-frontend
sudo chown -R $USER:$USER /var/www/onedc-api /var/www/onedc-frontend

# Extract applications
tar -xzf onedc-backend-dev.tar.gz -C /var/www/onedc-api/
tar -xzf onedc-frontend-dev.tar.gz -C /var/www/onedc-frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/onedc-api /var/www/onedc-frontend
```

### Step 5: Configure Services (On VM)

#### Create systemd service:
```bash
sudo tee /etc/systemd/system/onedc-api.service > /dev/null << EOF
[Unit]
Description=OneDC API Service (Development)
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/onedc-api/OneDc.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=onedc-api-dev
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
WorkingDirectory=/var/www/onedc-api

[Install]
WantedBy=multi-user.target
EOF
```

#### Configure Nginx:
```bash
sudo tee /etc/nginx/sites-available/onedc-dev > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 135.233.176.35;
    
    root /var/www/onedc-frontend/onedc;
    index index.html;

    # Handle Angular routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1d;
        add_header Cache-Control "public";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/onedc-dev /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

### Step 6: Start Services (On VM)

```bash
# Enable and start API service
sudo systemctl daemon-reload
sudo systemctl enable onedc-api.service
sudo systemctl start onedc-api.service

# Start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check service status
sudo systemctl status onedc-api.service
sudo systemctl status nginx
```

### Step 7: Test Development Deployment

```bash
# Test API health
curl http://135.233.176.35:5000/api/health

# Test frontend
curl -I http://135.233.176.35

# Test API through proxy
curl http://135.233.176.35/api/health
```

### Step 8: Access Your Development Application

🌐 **Open browser to:** `http://135.233.176.35`

🔑 **Default Login:**
- **Email:** `admin@yourcompany.com`
- **Password:** `YourSecurePassword123!`

## 🔧 Development vs Production Differences

| Component | Development | Production |
|-----------|-------------|------------|
| Database | `onedc_development` | `onedc_production` |
| Logging | More verbose | Optimized |
| App Title | "OneDC (Development)" | "OneDC" |
| JWT Key | Development key | Production key |
| SSL Mode | Prefer | Require |

## 📊 Monitoring Development Server

```bash
# View API logs
sudo journalctl -u onedc-api.service -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check database connection
sudo -u postgres psql -c "\l" | grep onedc

# Check running processes
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80
```

## 🚨 Troubleshooting

### If API service fails to start:
```bash
sudo journalctl -u onedc-api.service --no-pager
```

### If frontend doesn't load:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### If database connection fails:
1. Check database host address in appsettings.Development.Server.json
2. Verify network connectivity to database
3. Check database credentials

## 🔄 Updating Development Server

To deploy updates:
```bash
# 1. Build locally (repeat Steps 2-3)
# 2. Upload new packages to VM
# 3. On VM:
sudo systemctl stop onedc-api.service
tar -xzf onedc-backend-dev.tar.gz -C /var/www/onedc-api/
tar -xzf onedc-frontend-dev.tar.gz -C /var/www/onedc-frontend/
sudo chown -R www-data:www-data /var/www/onedc-*
sudo systemctl start onedc-api.service
sudo systemctl reload nginx
```

## ✅ Success Indicators

- ✅ API responds at `http://135.233.176.35:5000/api/health`
- ✅ Frontend loads at `http://135.233.176.35`
- ✅ Login page appears with "OneDC (Development)" title
- ✅ Can login with default credentials
- ✅ Database tables are created automatically
- ✅ Can create timesheet entries
