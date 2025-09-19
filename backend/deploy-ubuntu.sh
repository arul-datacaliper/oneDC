#!/bin/bash

# OneDC Backend Deployment Script for Ubuntu 24
# Run this script as a user with sudo privileges

set -e

echo "🚀 OneDC Backend Deployment Script"
echo "=================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please run this script as a regular user with sudo privileges, not as root."
    exit 1
fi

# Variables
APP_DIR="/opt/onedc-api"
SERVICE_NAME="onedc-api"
USER_NAME="www-data"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "📦 Step 1: Installing .NET 9.0 Runtime..."
if ! command_exists dotnet; then
    echo "Installing .NET 9.0 runtime..."
    
    # Download and install Microsoft package repository
    wget -q https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
    sudo dpkg -i packages-microsoft-prod.deb
    rm packages-microsoft-prod.deb
    
    # Update and install
    sudo apt update
    sudo apt install aspnetcore-runtime-9.0 -y
    
    echo "✅ .NET 9.0 runtime installed successfully"
else
    echo "✅ .NET runtime already installed"
fi

echo "📁 Step 2: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR
echo "✅ Application directory created: $APP_DIR"

echo "📦 Step 3: Extracting application files..."
if [ -f "onedc-backend-deployment.tar.gz" ]; then
    tar -xzf onedc-backend-deployment.tar.gz -C $APP_DIR
    echo "✅ Application files extracted"
else
    echo "❌ onedc-backend-deployment.tar.gz not found!"
    echo "Please ensure the deployment package is in the current directory."
    exit 1
fi

echo "🔐 Step 4: Setting permissions..."
sudo chmod +x $APP_DIR/OneDc.Api
sudo chown -R $USER_NAME:$USER_NAME $APP_DIR
echo "✅ Permissions set"

echo "⚙️  Step 5: Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=OneDC API
After=network.target

[Service]
Type=notify
ExecStart=$APP_DIR/OneDc.Api
Restart=always
RestartSec=5
TimeoutStopSec=90
KillSignal=SIGINT
SyslogIdentifier=$SERVICE_NAME
User=$USER_NAME
Environment=ASPNETCORE_ENVIRONMENT=Staging
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ASPNETCORE_URLS=http://0.0.0.0:5000
WorkingDirectory=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service created"

echo "🔄 Step 6: Starting service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ OneDC API service started successfully"
    echo "📊 Service status:"
    sudo systemctl status $SERVICE_NAME --no-pager -l
else
    echo "❌ Failed to start OneDC API service"
    echo "📋 Service logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -l
    exit 1
fi

echo "🔥 Step 7: Configuring firewall..."
if command_exists ufw; then
    sudo ufw allow 5000/tcp
    echo "✅ Firewall configured to allow port 5000"
else
    echo "ℹ️  UFW not installed, please configure firewall manually if needed"
fi

echo "🧪 Step 8: Testing API..."
sleep 2
if curl -s http://localhost:5000/weatherforecast >/dev/null; then
    echo "✅ API is responding correctly"
else
    echo "⚠️  API test failed, but service is running. Check logs if needed."
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Quick Reference:"
echo "• Service status: sudo systemctl status $SERVICE_NAME"
echo "• View logs: sudo journalctl -u $SERVICE_NAME -f"
echo "• Stop service: sudo systemctl stop $SERVICE_NAME"
echo "• Start service: sudo systemctl start $SERVICE_NAME"
echo "• Restart service: sudo systemctl restart $SERVICE_NAME"
echo ""
echo "🌐 API Endpoints:"
echo "• Test endpoint: http://your-server:5000/weatherforecast"
echo "• Swagger UI: http://your-server:5000/swagger (if enabled)"
echo ""
echo "Database: Already configured to connect to onedc_dev database"
echo "Environment: Staging (using appsettings.Staging.json)"
