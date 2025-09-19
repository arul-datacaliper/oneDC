# OneDC VM Deployment Guide
# VM IP: 135.233.176.35

## Step-by-Step Deployment Process

### Step 1: Connect to VM
```bash
ssh username@135.233.176.35
# Enter your password when prompted
```

### Step 2: System Setup (Run on VM)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install .NET 9.0 Runtime
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y aspnetcore-runtime-9.0

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Node.js (optional - for frontend building)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Create application directory
sudo mkdir -p /var/www/onedc-api
sudo mkdir -p /var/www/onedc-frontend
sudo chown -R $USER:$USER /var/www/onedc-api
sudo chown -R $USER:$USER /var/www/onedc-frontend
```

### Step 3: Database Setup (Run on VM)

**Note:** If your infra team provided a separate database host address, you can skip the local PostgreSQL installation and use the external database instead.

#### Option A: Use External Database (Recommended if provided)
If you have a separate database host, update your connection string in `appsettings.Production.json`:
```json
"OneDcDb": "Host=YOUR_DB_HOST_ADDRESS;Database=onedc_production;Username=your_db_user;Password=your_db_password;SSL Mode=Require"
```

#### Option B: Local PostgreSQL Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE onedc_production;
CREATE USER onedc_user WITH ENCRYPTED PASSWORD 'OneDC_Secure_2025!';
GRANT ALL PRIVILEGES ON DATABASE onedc_production TO onedc_user;
ALTER USER onedc_user CREATEDB;
\q

# Test database connection
psql -h localhost -U onedc_user -d onedc_production -c "SELECT version();"
```

### Step 4: Prepare Local Files for Upload

On your **local machine**, create the production configuration files:

#### Create appsettings.Production.json
```json
{
  "ConnectionStrings": {
    "OneDcDb": "Host=YOUR_DB_HOST_ADDRESS;Database=onedc_production;Username=onedc_user;Password=OneDC_Secure_2025!;SSL Mode=Prefer"
  },
  "Jwt": {
    "Key": "OneDC-Super-Secure-JWT-Key-256-Bit-Production-2025-Change-This-Key!",
    "Issuer": "OneDC-Production",
    "Audience": "OneDC-Users"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

**IMPORTANT:** Replace `YOUR_DB_HOST_ADDRESS` with the actual database host address provided by your infra team.

#### Update Frontend Environment
Create `frontend/onedc/src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: '/api', // Relative path - Nginx will proxy API calls
  appName: 'OneDC - Time Tracking',
  version: '1.0.0'
};
```

### Step 5: Build and Upload Backend

On your **local machine**:
```bash
# Navigate to backend directory
cd backend

# Create production config (save the JSON above as appsettings.Production.json in OneDc.Api folder)

# Build and publish
dotnet publish OneDc.Api -c Release -o ./publish

# Create deployment package
tar -czf onedc-backend.tar.gz -C publish .
```

Upload to VM:
```bash
# Upload the backend package
scp onedc-backend.tar.gz username@135.233.176.35:~/

# Connect to VM and extract
ssh username@135.233.176.35
cd ~
tar -xzf onedc-backend.tar.gz -C /var/www/onedc-api/
```

### Step 6: Build and Upload Frontend

On your **local machine**:
```bash
# Navigate to frontend
cd frontend/onedc

# Install dependencies and build
npm install
npm run build

# Create deployment package
cd dist
tar -czf onedc-frontend.tar.gz onedc/
```

Upload to VM:
```bash
# Upload frontend package
scp dist/onedc-frontend.tar.gz username@135.233.176.35:~/

# Connect to VM and extract
ssh username@135.233.176.35
cd ~
tar -xzf onedc-frontend.tar.gz -C /var/www/onedc-frontend/
```

### Step 7: Configure Services on VM

#### Create systemd service for backend:
```bash
sudo nano /etc/systemd/system/onedc-api.service
```

Add this content:
```ini
[Unit]
Description=OneDC API Service
After=network.target postgresql.service

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /var/www/onedc-api/OneDc.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=onedc-api
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
WorkingDirectory=/var/www/onedc-api

[Install]
WantedBy=multi-user.target
```

#### Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/onedc
```

Add this content:
```nginx
# OneDC Frontend
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 135.233.176.35;
    
    root /var/www/onedc-frontend/onedc;
    index index.html;

    # Handle Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/onedc /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Start Services

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/onedc-api
sudo chown -R www-data:www-data /var/www/onedc-frontend

# Start and enable services
sudo systemctl enable onedc-api.service
sudo systemctl start onedc-api.service

# Check status
sudo systemctl status onedc-api.service
sudo systemctl status nginx
sudo systemctl status postgresql

# View logs if needed
sudo journalctl -u onedc-api.service -f
```

### Step 9: Test Deployment

1. **Check API:** `curl http://135.233.176.35:5000/api/health`
2. **Check Frontend:** Open browser to `http://135.233.176.35`
3. **Login with default admin:**
   - Email: `admin@yourcompany.com`
   - Password: `YourSecurePassword123!`

### Step 10: Security & Final Setup

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000

# Set up SSL certificate (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Quick Commands Summary

```bash
# On your local machine:
1. Update appsettings.Production.json
2. Update environment.prod.ts
3. Run: ./scripts/deploy-backend.sh
4. Run: ./scripts/deploy-frontend.sh
5. Upload files to VM

# On VM (135.233.176.35):
1. Install prerequisites
2. Setup database
3. Extract and configure applications
4. Start services
5. Test deployment
```

## Troubleshooting

If services fail to start:
```bash
# Check logs
sudo journalctl -u onedc-api.service
sudo journalctl -u nginx.service

# Check if ports are available
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :80

# Restart services
sudo systemctl restart onedc-api.service
sudo systemctl restart nginx
```

## Frontend Application Access

### **How to Access Your Application:**

1. **Main Application URL:**
   ```
   http://135.233.176.35
   ```

2. **What happens when you visit this URL:**
   - Nginx serves your Angular frontend application
   - API calls are automatically proxied to the backend
   - Everything works seamlessly through a single URL

3. **Application Flow:**
   ```
   User Browser → http://135.233.176.35 → Nginx → Angular App
                                               ↓
   API Calls → http://135.233.176.35/api → Nginx Proxy → Backend (port 5000)
   ```

4. **Default Login Credentials:**
   - **Email:** `admin@yourcompany.com`
   - **Password:** `YourSecurePassword123!`

### **Testing Access:**

```bash
# Test frontend
curl -I http://135.233.176.35
# Should return 200 OK with HTML content

# Test API through proxy
curl http://135.233.176.35/api/health
# Should return API health status

# Test direct backend (for troubleshooting)
curl http://135.233.176.35:5000/api/health
# Should return same health status
```

### **Troubleshooting Access Issues:**

If you can't access the application:

1. **Check if services are running:**
   ```bash
   sudo systemctl status nginx
   sudo systemctl status onedc-api.service
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status
   # Should show port 80 as allowed
   ```

3. **Check Nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Check logs:**
   ```bash
   sudo journalctl -u nginx.service -f
   sudo journalctl -u onedc-api.service -f
   ```

### **Network Architecture:**

```
Internet → VM (135.233.176.35:80) → Nginx → Angular Frontend
                                        ↓
                         API Proxy → Backend (localhost:5000)
                                        ↓
                                   Database Host
```

### **URLs Summary:**
- **Frontend Application:** `http://135.233.176.35`
- **API Endpoints:** `http://135.233.176.35/api/*`
- **Direct Backend (for troubleshooting):** `http://135.233.176.35:5000/api/*`

## Default Login Credentials

After successful deployment:
- **URL:** `http://135.233.176.35`
- **Email:** `admin@yourcompany.com`
- **Password:** `YourSecurePassword123!`

**IMPORTANT:** Change these credentials immediately after first login!
