# OneDC Backend - Quick Start

## Files in this package:
- `onedc-backend-deployment.tar.gz` - Application binaries
- `deploy-ubuntu.sh` - Automated deployment script
- `onedc-api.service` - Systemd service file
- `deploy-instructions.md` - Detailed deployment guide

## Quick Deployment (Ubuntu 24):

1. **Run the automated script:**
   ```bash
   sudo chmod +x deploy-ubuntu.sh
   ./deploy-ubuntu.sh
   ```

2. **Manual steps if needed:**
   ```bash
   # Extract files
   sudo mkdir -p /opt/onedc-api
   tar -xzf onedc-backend-deployment.tar.gz -C /opt/onedc-api
   
   # Install service
   sudo cp onedc-api.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable onedc-api
   sudo systemctl start onedc-api
   ```

## Database Configuration:
- **Host:** 135.233.176.35
- **Database:** onedc_dev  
- **User:** onedc_dev_user
- **Password:** OnedcDevUser@1234
- **Tables:** Already created and migrated ✅

## API Endpoints:
- **Port:** 5000 (HTTP)
- **Test:** http://your-server:5000/weatherforecast
- **Health:** Service automatically seeds test data

## Service Management:
```bash
sudo systemctl status onedc-api     # Check status
sudo systemctl restart onedc-api    # Restart
sudo journalctl -u onedc-api -f     # View logs
```

## Requirements:
- Ubuntu 24.04 LTS
- .NET 9.0 Runtime (script installs automatically)
- Network access to database server
- Port 5000 accessible

## Support:
The application is configured for staging environment and will automatically connect to the database on startup.
