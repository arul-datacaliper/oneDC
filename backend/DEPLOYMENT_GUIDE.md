# OneDC Deployment Guide

## 🎯 Environment Configuration

Your deployment script now supports **TWO separate environments** that can run simultaneously:

| Environment | Server IP | Deploy Path | Port | Database | .env File |
|-------------|-----------|-------------|------|----------|-----------|
| **Development** | 135.233.176.35 | `/home/azureuser/datacaliper/onedc-dev` | 5260 | `onedc_dev` | `.env.development` |
| **Production** | 40.74.201.85 | `/home/azureuser/datacaliper/onedc-prod` | 5000 | `onedc_prod` | `.env.production` |

## 🚀 How to Deploy

### Deploy to Development
```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
./auto-deploy.sh development
```

**What happens:**
1. ✅ Uses `.env.development` configuration
2. ✅ Deploys to `135.233.176.35:/home/azureuser/datacaliper/onedc-dev`
3. ✅ Runs on port `5260`
4. ✅ Connects to `onedc_dev` database
5. ✅ Accessible at: `http://135.233.176.35:5260`

### Deploy to Production
```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
./auto-deploy.sh production
```

**What happens:**
1. ✅ Uses `.env.production` configuration
2. ✅ Deploys to `40.74.201.85:/home/azureuser/datacaliper/onedc-prod`
3. ✅ Runs on port `5000`
4. ✅ Connects to `onedc_prod` database
5. ✅ Accessible at: `http://40.74.201.85:5000`

## ✅ Key Benefits

### Both Environments Can Run Simultaneously
- ✅ Development doesn't affect Production
- ✅ Production doesn't affect Development
- ✅ Different databases (no data mixing)
- ✅ Different servers (or same server, different paths)
- ✅ Different ports (no conflicts)

### One Command Deployment
```bash
# Deploy to dev - one command
./auto-deploy.sh development

# Deploy to prod - one command  
./auto-deploy.sh production
```

## 📋 Pre-Deployment Checklist

### Before First Production Deployment

- [ ] **Database Setup**
  ```bash
  # Connect to production database server
  psql -h 40.74.201.85 -U postgres
  
  # Create production database
  CREATE DATABASE onedc_prod;
  CREATE USER onedc_prod_user WITH PASSWORD 'OnedcProdUser@1234';
  GRANT ALL PRIVILEGES ON DATABASE onedc_prod TO onedc_prod_user;
  \c onedc_prod
  GRANT ALL ON SCHEMA public TO onedc_prod_user;
  ```

- [ ] **Update `.env.production`**
  ```bash
  # Verify these settings in backend/.env.production:
  DATABASE_CONNECTION_STRING=Host=40.74.201.85;Database=onedc_prod;...
  JWT_SECRET_KEY=<unique_production_key>
  APP_BASE_URL=http://40.74.201.85:4200
  ```

- [ ] **Run Migrations on Production DB**
  ```bash
  cd backend
  cp .env.production OneDc.Api/.env
  cd OneDc.Api
  dotnet ef database update
  ```

- [ ] **Create Admin User in Production DB**
  ```bash
  cd backend/scripts
  psql -h 40.74.201.85 -U onedc_prod_user -d onedc_prod -f insert_admin_ready.sql
  ```

- [ ] **Test Deployment**
  ```bash
  ./auto-deploy.sh production
  ```

## 🔍 Monitoring & Management

### Check Application Status

**Development:**
```bash
# Check if running
ssh azureuser@135.233.176.35 'ps aux | grep OneDc.Api'

# View logs
ssh azureuser@135.233.176.35 'tail -f /home/azureuser/datacaliper/onedc-dev/logs/onedc.log'

# Stop application
ssh azureuser@135.233.176.35 'pkill -f OneDc.Api'
```

**Production:**
```bash
# Check if running
ssh azureuser@40.74.201.85 'ps aux | grep OneDc.Api'

# View logs
ssh azureuser@40.74.201.85 'tail -f /home/azureuser/datacaliper/onedc-prod/logs/onedc.log'

# Stop application
ssh azureuser@40.74.201.85 'pkill -f OneDc.Api'
```

### Test Endpoints

**Development:**
```bash
curl http://135.233.176.35:5260/api/health
curl http://135.233.176.35:5260/api/auth/login
```

**Production:**
```bash
curl http://40.74.201.85:5000/api/health
curl http://40.74.201.85:5000/api/auth/login
```

## 🔄 Typical Workflow

### Day-to-Day Development
```bash
# 1. Make code changes
# 2. Test locally
# 3. Deploy to dev for testing
./auto-deploy.sh development

# 4. Test on dev server: http://135.233.176.35:5260
# 5. If all good, deploy to production
./auto-deploy.sh production
```

### Rollback Production
```bash
# SSH to production server
ssh azureuser@40.74.201.85

# List previous releases
ls -la /home/azureuser/datacaliper/onedc-prod/releases/

# Stop current
pkill -f OneDc.Api

# Update symlink to previous release
ln -sfn /home/azureuser/datacaliper/onedc-prod/releases/20241103-143000 \
        /home/azureuser/datacaliper/onedc-prod/current

# Start previous version
cd /home/azureuser/datacaliper/onedc-prod/current
nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > ../logs/onedc.log 2>&1 &
```

## 🔐 Security Notes

1. **Different JWT Secrets**: Production and development MUST use different JWT secrets
2. **Separate Databases**: Never point production to dev database or vice versa
3. **Password Security**: Use strong passwords for production database
4. **SSL/TLS**: Consider enabling SSL for production database connections
5. **Firewall**: Ensure only necessary ports are open on production server

## 📊 Environment Comparison

| Aspect | Development | Production |
|--------|-------------|------------|
| Purpose | Testing, debugging | Live users |
| Data | Test/fake data | Real user data |
| Updates | Frequent | Controlled |
| Monitoring | Basic | Comprehensive |
| Backups | Optional | **Required** |
| Logging | Verbose | Error-level |

## 🆘 Troubleshooting

### Deployment fails with "connection refused"
- Check if you can SSH to the server manually
- Verify server IP in `.env.production` or `.env.development`
- Ensure SSH keys are set up correctly

### Application doesn't start after deployment
```bash
# Check logs
ssh azureuser@SERVER_IP 'tail -100 /home/azureuser/datacaliper/onedc-{ENV}/logs/onedc.log'

# Common issues:
# - Port already in use (another instance running)
# - Database connection fails (wrong credentials in .env)
# - Missing migrations (run dotnet ef database update)
```

### Wrong database being used
```bash
# Verify which .env file is in the deployed application
ssh azureuser@SERVER_IP 'cat /home/azureuser/datacaliper/onedc-{ENV}/current/.env'

# Check DATABASE_CONNECTION_STRING value
```

### Both environments connecting to same database
- Verify `.env.production` has `onedc_prod` database
- Verify `.env.development` has `onedc_dev` database  
- Redeploy after fixing .env files

## 📞 Quick Commands Reference

```bash
# Deploy
./auto-deploy.sh development  # Dev deployment
./auto-deploy.sh production   # Prod deployment

# Monitor
ssh azureuser@135.233.176.35 'tail -f /home/azureuser/datacaliper/onedc-dev/logs/onedc.log'
ssh azureuser@40.74.201.85 'tail -f /home/azureuser/datacaliper/onedc-prod/logs/onedc.log'

# Check status
ssh azureuser@135.233.176.35 'ps aux | grep OneDc.Api'
ssh azureuser@40.74.201.85 'ps aux | grep OneDc.Api'

# Test endpoints
curl http://135.233.176.35:5260/api/health  # Dev
curl http://40.74.201.85:5000/api/health    # Prod
```
