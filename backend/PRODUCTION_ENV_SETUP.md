# Production Environment Setup Guide

## Current Setup

Your deployment uses **environment-specific .env files**:

```
backend/
├── .env                    ← Currently active (for local dev)
├── .env.development        ← Used by: ./auto-deploy.sh development
├── .env.production         ← Used by: ./auto-deploy.sh production  ⭐ UPDATE THIS
└── OneDc.Api/
    └── .env                ← Same as backend/.env (local dev only)
```

## Deployment Flow

When you run:
```bash
./auto-deploy.sh production
```

The script does:
1. Builds the application
2. **Copies `backend/.env.production` to the build folder**
3. Deploys to server

## ⚠️ CRITICAL: Update Production Environment

### Step 1: Update backend/.env.production

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
nano .env.production
```

### Step 2: Change These Values

#### 1. Database (REQUIRED)
```bash
# Current (DEV database - WRONG for production!)
DATABASE_CONNECTION_STRING=Host=135.233.176.35;Database=onedc_dev;Username=onedc_dev_user;Password=OnedcDevUser@1234;SSL Mode=Prefer

# Should be (PRODUCTION database)
DATABASE_CONNECTION_STRING=Host=YOUR_PROD_HOST;Database=onedc_prod;Username=onedc_prod_user;Password=YOUR_SECURE_PASSWORD;SSL Mode=Require
```

**Options:**
- **Option A:** Create separate production database on same server (135.233.176.35)
  ```bash
  DATABASE_CONNECTION_STRING=Host=135.233.176.35;Database=onedc_prod;Username=onedc_prod_user;Password=NewSecurePassword123!;SSL Mode=Require
  ```

- **Option B:** Use different server for production database
  ```bash
  DATABASE_CONNECTION_STRING=Host=prod-db-server.com;Database=onedc_prod;Username=onedc_prod_user;Password=StrongPassword456!;SSL Mode=Require
  ```

#### 2. JWT Secret (REQUIRED)
```bash
# Generate a NEW secret for production:
openssl rand -base64 32

# Example output: 8xK9mN2pQ5rT7vY1zW4bC6dF8hJ0kL3nM5pR7sU9wX2a=

# Update in .env.production:
JWT_SECRET_KEY=8xK9mN2pQ5rT7vY1zW4bC6dF8hJ0kL3nM5pR7sU9wX2a=
```

**⚠️ NEVER use the same JWT secret in dev and production!**

#### 3. Application URL (REQUIRED)
```bash
# If you have a domain with SSL:
APP_BASE_URL=https://onedc.yourcompany.com

# If using IP address without SSL:
APP_BASE_URL=http://135.233.176.35:4200

# If using different production server:
APP_BASE_URL=http://YOUR_PROD_IP:4200
```

#### 4. Azure Email (OPTIONAL)
You can keep the same Azure email service, or configure a production-specific one.

### Step 3: Create Production Database

Before deploying, create the production database:

```bash
# Connect to PostgreSQL
psql -h 135.233.176.35 -U postgres

# Create production database and user
CREATE DATABASE onedc_prod;
CREATE USER onedc_prod_user WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE onedc_prod TO onedc_prod_user;

# Grant necessary permissions
\c onedc_prod
GRANT ALL ON SCHEMA public TO onedc_prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO onedc_prod_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO onedc_prod_user;

\q
```

### Step 4: Run Migrations on Production Database

After creating the database, update your connection string in `backend/.env.production`, then:

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend

# Temporarily use production connection for migrations
cp .env.production OneDc.Api/.env

# Run migrations
cd OneDc.Api
dotnet ef database update

# Restore dev connection
cp ../.env.development .env
```

### Step 5: Create Admin User in Production Database

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend/scripts

# Update the script to use production database
psql -h 135.233.176.35 -U onedc_prod_user -d onedc_prod -f insert_admin_ready.sql
```

### Step 6: Deploy to Production

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend
./auto-deploy.sh production
```

## Quick Reference

### Which file to edit?

| Scenario | Edit This File |
|----------|---------------|
| Local development | `backend/.env` or `backend/OneDc.Api/.env` |
| Development deployment | `backend/.env.development` |
| **Production deployment** | **`backend/.env.production`** ⭐ |

### Deployment commands

```bash
# Deploy to development
./auto-deploy.sh development

# Deploy to production
./auto-deploy.sh production
```

## Security Checklist

Before production deployment:

- [ ] Created separate production database (`onedc_prod`)
- [ ] Generated NEW JWT secret key (never reuse dev key!)
- [ ] Updated DATABASE_CONNECTION_STRING in `.env.production`
- [ ] Updated JWT_SECRET_KEY in `.env.production`
- [ ] Updated APP_BASE_URL to production domain/IP
- [ ] Changed database passwords from default values
- [ ] Ran migrations on production database
- [ ] Created admin user in production database
- [ ] Changed admin default password after first login
- [ ] Verified Azure email settings work
- [ ] SSL Mode set to "Require" for production DB
- [ ] Tested production deployment on staging first

## Troubleshooting

### "Database does not exist" error
- Make sure you created the production database (Step 3)
- Verify connection string in `.env.production`

### "Table does not exist" error  
- Run migrations on production database (Step 4)

### Cannot login after deployment
- Make sure you created admin user in PRODUCTION database (Step 5)
- Verify you're using the production database, not dev

### Wrong database being used
- Check which .env file was copied during deployment
- Verify `auto-deploy.sh` is copying the correct file
- Check the database name in connection string

## File Locations

```
/Users/arul/oneDC/MVP-ver1/oneDC/backend/
├── .env.production          ← Edit this for production config
├── auto-deploy.sh           ← Deployment script
└── scripts/
    └── insert_admin_ready.sql  ← Create admin user
```
