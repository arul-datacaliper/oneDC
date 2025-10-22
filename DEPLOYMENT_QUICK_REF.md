# OneDC Deployment Quick Reference

## 🚀 One-Command Deployment

### A## 📋 First-Time Setup

1. **Update production credentials:**
   ```bash
   cd backend
   nano .env.production
   ``` (Recommended)
```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
./auto-deploy.sh production
```

### Manual Deployment
```bash
# 1. Build
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
dotnet publish OneDc.Api -c Release -r linux-x64 --self-contained true -o ./publish/linux-x64-final

# 2. Set environment
cd ./publish/linux-x64-final
cp .env.production .env

# 3. Create package
tar -czf ~/onedc-backend-$(date +%Y%m%d).tar.gz .

# 4. Transfer
scp ~/onedc-backend-*.tar.gz azureuser@135.233.176.35:/home/azureuser/datacaliper/backendnew/

# 5. Deploy on server
ssh azureuser@135.233.176.35
cd /home/azureuser/datacaliper/backendnew
tar -xzf onedc-backend-*.tar.gz
chmod +x OneDc.Api
pkill -f OneDc.Api
nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > /opt/onedc/logs/onedc.log 2>&1 &
```

## 📋 Environment Configuration

| Environment | APP_BASE_URL | Database | Command |
|------------|--------------|----------|---------|
| Development | http://localhost:4200 | onedc_dev | `./auto-deploy.sh development` |
| Production | http://135.233.176.35:4200 | onedc_prod | `./auto-deploy.sh production` |

## 🔧 Server Management Commands

### Start/Stop/Restart
```bash
# Stop
ssh azureuser@135.233.176.35 'pkill -f OneDc.Api'

# Start  
ssh azureuser@135.233.176.35 'cd /home/azureuser/datacaliper/backendnew/current && nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > /home/azureuser/datacaliper/backendnew/logs/onedc.log 2>&1 &'

# Restart
ssh azureuser@135.233.176.35 'pkill -f OneDc.Api && cd /home/azureuser/datacaliper/backendnew/current && nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > /home/azureuser/datacaliper/backendnew/logs/onedc.log 2>&1 &'
```

### Monitoring
```bash
# View logs (real-time)
ssh azureuser@135.233.176.35 'tail -f /home/azureuser/datacaliper/backendnew/logs/onedc.log'

# Check if running
ssh azureuser@135.233.176.35 'ps aux | grep OneDc.Api'

# Check port
ssh azureuser@135.233.176.35 'netstat -tuln | grep 5000'

# Test API
curl http://135.233.176.35:5000/api/health
```

## 🔐 First-Time Setup

1. **Create production environment file:**
   ```bash
   cd backend/publish/linux-x64-final
   cp .env.production.template .env.production
   nano .env.production
   ```

2. **Generate JWT secret:**
   ```bash
   openssl rand -base64 32
   ```

3. **Update `.env.production` with:**
   - Real database password
   - SendGrid API key  
   - Generated JWT secret
   - Production server IP

4. **Create server directories (if not exists):**
   ```bash
   ssh azureuser@135.233.176.35 'mkdir -p /home/azureuser/datacaliper/backendnew/releases /home/azureuser/datacaliper/backendnew/logs'
   ```

## ⚠️ Important Notes

✅ **DO:**
- Use `.env.production` for production deployments
- Keep `.env.production` in `.gitignore`
- Generate unique JWT secrets for production
- Test locally before deploying

❌ **DON'T:**
- Commit `.env.production` with real credentials
- Use development secrets in production
- Deploy without testing
- Forget to backup before deploying

## 📱 Quick Status Check

```bash
# One-liner to check everything
ssh azureuser@135.233.176.35 'echo "=== Process ===" && ps aux | grep OneDc.Api | grep -v grep && echo "=== Port ===" && netstat -tuln | grep 5000 && echo "=== Logs (last 10 lines) ===" && tail -10 /home/azureuser/datacaliper/backendnew/logs/onedc.log'
```

## 🔄 Rollback

```bash
ssh azureuser@135.233.176.35
cd /home/azureuser/datacaliper/backendnew
pkill -f OneDc.Api
ln -sfn backup-YYYYMMDD-HHMMSS current
cd current && nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > /home/azureuser/datacaliper/backendnew/logs/onedc.log 2>&1 &
```

## 📚 Documentation Files

- **PRODUCTION_DEPLOYMENT.md** - Complete deployment guide
- **DEPLOYMENT.md** - Environment configuration guide
- **auto-deploy.sh** - Automated deployment script
- **deploy.sh** - Environment switching script
