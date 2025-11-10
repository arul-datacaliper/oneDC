# Production Environment Setup Guide

## Current Environment File Structure

Your deployment script uses environment-specific files:

```
backend/
├── .env                          # Default/current config (used by local development)
├── .env.development             # Development environment config
├── .env.production              # Production environment config ⚠️
├── .env.production.template     # Template for production setup
└── auto-deploy.sh               # Deployment script
```

## How the Deployment Script Works

The `auto-deploy.sh` script:
1. Takes environment as parameter: `./auto-deploy.sh [production|development]`
2. Looks for `.env.production` or `.env.development` in `/backend/` directory
3. Copies the appropriate file to the build output as `.env`
4. Deploys to the server

## ⚠️ IMPORTANT: Production Configuration Needed

Your current `.env.production` file still has **development values**. Before deploying to production, you MUST update it with production-specific values:

### Critical Changes Needed:

#### 1. Database Configuration
```bash
# ❌ CURRENT (Development database)
DATABASE_CONNECTION_STRING=Host=135.233.176.35;Database=onedc_dev;Username=onedc_dev_user;Password=OnedcDevUser@1234;SSL Mode=Prefer

# ✅ SHOULD BE (Production database)
DATABASE_CONNECTION_STRING=Host=YOUR_PROD_DB_HOST;Database=onedc_prod;Username=onedc_prod_user;Password=STRONG_SECURE_PASSWORD;SSL Mode=Require
```

**Action Items:**
- [ ] Create separate production database: `onedc_prod`
- [ ] Create production database user with strong password
- [ ] Use SSL Mode=Require for production security
- [ ] Consider using managed database service (Azure Database for PostgreSQL, AWS RDS, etc.)

#### 2. JWT Secret Key
```bash
# ❌ CURRENT (Same as dev - SECURITY RISK!)
JWT_SECRET_KEY=UMB6Sko2mvUHBWyewXtzWHIODvYarjmueXTIWp0jZEg=

# ✅ SHOULD BE (Unique production key)
JWT_SECRET_KEY=YOUR_NEW_PRODUCTION_SECRET_KEY_HERE
```

**Generate a new key:**
```bash
# Method 1: Using openssl
openssl rand -base64 32

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Method 3: Online generator (use trusted source)
# Visit: https://www.grc.com/passwords.htm
```

**⚠️ NEVER use the same JWT secret in dev and production!**

#### 3. Application Base URL
```bash
# ❌ CURRENT (Development URL with port)
APP_BASE_URL=http://135.233.176.35:4200

# ✅ SHOULD BE (Production domain with HTTPS)
APP_BASE_URL=https://onedc.yourdomain.com
# OR if using IP without domain:
APP_BASE_URL=https://135.233.176.35
```

**Action Items:**
- [ ] Register a production domain name
- [ ] Configure DNS to point to your production server
- [ ] Set up SSL/TLS certificate (Let's Encrypt, Azure Certificate, etc.)
- [ ] Update APP_BASE_URL with HTTPS URL

#### 4. Email Configuration (Optional)
If you want separate email settings for production:
```bash
# Consider using production Azure Communication Service
AZURE_EMAIL_CONNECTION_STRING=endpoint=https://production-comm.azure.com/;accesskey=PROD_KEY
AZURE_EMAIL_FROM_EMAIL=noreply@yourdomain.com
AZURE_EMAIL_FROM_NAME=OneDC Production System
```

## Production Deployment Checklist

### Before First Production Deployment:

#### Database Setup
- [ ] Create production PostgreSQL database (`onedc_prod`)
- [ ] Create dedicated production database user
- [ ] Set strong password (min 16 characters, mixed case, numbers, symbols)
- [ ] Enable SSL connections (SSL Mode=Require)
- [ ] Run database migrations on production database
- [ ] Backup database (set up automated backups)
- [ ] Test database connection

#### Security
- [ ] Generate new JWT secret key for production
- [ ] Update `.env.production` with new JWT secret
- [ ] Enable HTTPS/SSL for the application
- [ ] Configure firewall rules (allow only necessary ports)
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Review and remove any debug/dev endpoints

#### Domain & DNS
- [ ] Register production domain (e.g., onedc.yourdomain.com)
- [ ] Configure DNS A record to point to server IP
- [ ] Obtain SSL/TLS certificate (Let's Encrypt or commercial)
- [ ] Configure web server (Nginx/Apache) with SSL
- [ ] Update APP_BASE_URL in `.env.production`

#### Email Service
- [ ] Verify Azure Email Service is configured for production
- [ ] Test email sending from production
- [ ] Configure SPF/DKIM records for your domain
- [ ] Set up email monitoring/alerts

#### Application Configuration
- [ ] Review all environment variables in `.env.production`
- [ ] Ensure no development values remain
- [ ] Set appropriate logging levels
- [ ] Configure error reporting/monitoring (Application Insights, Sentry, etc.)

#### Testing
- [ ] Deploy to staging environment first (if available)
- [ ] Run smoke tests
- [ ] Test all critical workflows
- [ ] Verify email sending works
- [ ] Test authentication and authorization
- [ ] Performance testing under load

#### Backup & Recovery
- [ ] Set up database backup strategy (daily minimum)
- [ ] Test database restore procedure
- [ ] Document rollback procedure
- [ ] Keep previous deployment packages for rollback

#### Monitoring
- [ ] Set up application monitoring
- [ ] Configure health check endpoints
- [ ] Set up alerts for errors/downtime
- [ ] Monitor disk space, memory, CPU
- [ ] Set up log aggregation

## How to Deploy to Production

### Step 1: Update Production Configuration

Edit `/backend/.env.production`:
```bash
nano /Users/arul/oneDC/MVP-ver1/oneDC/backend/.env.production
```

Update all values as described above.

### Step 2: Verify Configuration

```bash
# Check your production config (without showing sensitive values)
cat /Users/arul/oneDC/MVP-ver1/oneDC/backend/.env.production | grep -v "PASSWORD\|SECRET\|CONNECTION_STRING"
```

### Step 3: Run Deployment

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend

# Deploy to production
./auto-deploy.sh production
```

The script will:
1. Build the application
2. Copy `.env.production` to build output
3. Create deployment package
4. Transfer to production server (135.233.176.35)
5. Deploy and start the application

### Step 4: Verify Deployment

```bash
# Check if application is running
ssh azureuser@135.233.176.35 'ps aux | grep OneDc.Api'

# View logs
ssh azureuser@135.233.176.35 'tail -f /home/azureuser/datacaliper/backendnew/logs/onedc.log'

# Test health endpoint
curl http://135.233.176.35:5000/health
```

## Current vs Production Configuration

| Setting | Current (.env.production) | Recommended Production |
|---------|---------------------------|------------------------|
| **Database** | onedc_dev | onedc_prod (separate DB) |
| **DB Password** | OnedcDevUser@1234 | Strong unique password |
| **SSL Mode** | Prefer | Require |
| **JWT Secret** | Dev key (shared) | Unique production key |
| **APP_BASE_URL** | http://IP:4200 | https://domain.com |
| **Email** | Dev Azure Service | Prod Azure Service |

## Security Recommendations

### Critical (Must Do):
1. ✅ **Separate Database**: Never use same database for dev and prod
2. ✅ **Unique JWT Secret**: Generate new secret for production
3. ✅ **Strong Passwords**: Use 16+ character passwords with mixed case, numbers, symbols
4. ✅ **HTTPS Only**: Always use HTTPS in production
5. ✅ **Firewall**: Only allow necessary ports (443, 5000, 5432)

### Important (Should Do):
- Enable database backups (automated daily)
- Set up monitoring and alerts
- Use managed database service (Azure Database, AWS RDS)
- Implement rate limiting
- Enable audit logging
- Regular security updates

### Recommended (Nice to Have):
- Use Azure Key Vault or AWS Secrets Manager for secrets
- Set up staging environment
- Implement CI/CD pipeline
- Use load balancer for high availability
- Set up CDN for frontend assets

## Environment File Security

### ⚠️ NEVER commit production credentials to Git

Add to `.gitignore`:
```
.env
.env.production
.env.*.local
```

### Keep `.env.production.template` in Git:
- This should only contain placeholder values
- Serves as documentation for required variables
- Helps new team members set up their environment

## Rollback Procedure

If production deployment fails:

### Option 1: Quick Rollback (SSH)
```bash
ssh azureuser@135.233.176.35

cd /home/azureuser/datacaliper/backendnew

# Stop current instance
pkill -f OneDc.Api

# List available releases
ls -la releases/

# Link to previous release
ln -sfn releases/PREVIOUS_TIMESTAMP current

# Start previous version
cd current
nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > ../logs/onedc.log 2>&1 &
```

### Option 2: Redeploy Previous Version
```bash
# Keep older deployment packages
# Redeploy specific version by transferring old package
```

## Production Monitoring Commands

```bash
# Check application status
ssh azureuser@135.233.176.35 'ps aux | grep OneDc.Api'

# View real-time logs
ssh azureuser@135.233.176.35 'tail -f /home/azureuser/datacaliper/backendnew/logs/onedc.log'

# Check disk space
ssh azureuser@135.233.176.35 'df -h'

# Check memory usage
ssh azureuser@135.233.176.35 'free -h'

# Check network connections
ssh azureuser@135.233.176.35 'netstat -tlnp | grep 5000'

# Restart application
ssh azureuser@135.233.176.35 'pkill -f OneDc.Api && cd /home/azureuser/datacaliper/backendnew/current && nohup ./OneDc.Api --urls "http://0.0.0.0:5000" > ../logs/onedc.log 2>&1 &'
```

## Next Steps

1. **Create Production Database**
   ```sql
   CREATE DATABASE onedc_prod;
   CREATE USER onedc_prod_user WITH PASSWORD 'your-strong-password';
   GRANT ALL PRIVILEGES ON DATABASE onedc_prod TO onedc_prod_user;
   ```

2. **Run Migrations on Production DB**
   ```bash
   # Update connection string in .env.production first
   cd backend/OneDc.Api
   dotnet ef database update --connection "Host=...;Database=onedc_prod;..."
   ```

3. **Generate Production JWT Secret**
   ```bash
   openssl rand -base64 32
   # Copy output to .env.production JWT_SECRET_KEY
   ```

4. **Update .env.production**
   - Replace all development values
   - Test each configuration setting

5. **Test Deployment**
   ```bash
   ./auto-deploy.sh production
   ```

6. **Verify and Monitor**
   - Check logs for errors
   - Test all critical features
   - Set up monitoring alerts

## Support

If you need help:
- Check deployment logs: `/home/azureuser/datacaliper/backendnew/logs/onedc.log`
- Review this guide
- Contact DevOps team

---

**Last Updated:** November 2025  
**Version:** 1.0
