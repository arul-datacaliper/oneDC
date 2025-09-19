# Database Configuration Guide

## If your infra team provided a separate database host:

### 1. Update appsettings.Production.json
Replace the connection string with your database details:

```json
{
  "ConnectionStrings": {
    "OneDcDb": "Host=YOUR_DB_HOST_ADDRESS;Port=5432;Database=onedc_production;Username=your_db_user;Password=your_db_password;SSL Mode=Require"
  }
}
```

### 2. Common Database Connection String Formats:

#### PostgreSQL (Standard):
```
Host=db.yourcompany.com;Port=5432;Database=onedc_production;Username=onedc_user;Password=your_password;SSL Mode=Require
```

#### PostgreSQL with Custom Port:
```
Host=135.233.176.100;Port=5433;Database=onedc_production;Username=onedc_user;Password=your_password;SSL Mode=Require
```

#### PostgreSQL with Additional Parameters:
```
Host=db.yourcompany.com;Port=5432;Database=onedc_production;Username=onedc_user;Password=your_password;SSL Mode=Require;Trust Server Certificate=true;Command Timeout=30
```

### 3. What you need from your infra team:

- **Database Host/IP Address**: `___.___.___.___` or `db.yourcompany.com`
- **Port**: Usually `5432` for PostgreSQL
- **Database Name**: `onedc_production` (or as specified)
- **Username**: Database user with appropriate permissions
- **Password**: Strong password for the database user
- **SSL Requirements**: Whether SSL is required/preferred

### 4. Database Permissions Required:

Your database user needs these permissions:
- CREATE and DROP tables
- INSERT, UPDATE, DELETE, SELECT on all tables
- CREATE and DROP indexes
- CREATE sequences
- USAGE on schema

### 5. Test Database Connection:

After updating the connection string, test it with:

```bash
# If PostgreSQL client is installed
psql -h YOUR_DB_HOST_ADDRESS -p 5432 -U your_db_user -d onedc_production -c "SELECT version();"

# Or test from the application
dotnet run --project OneDc.Api
# Check logs for database connection success/failure
```

### 6. Firewall Considerations:

Make sure your VM can reach the database:
- Database port (usually 5432) should be open from VM to DB host
- VM IP should be whitelisted on database server
- SSL certificates properly configured if required

### 7. Environment Variables (Alternative):

Instead of storing credentials in appsettings.json, you can use environment variables:

```bash
export ConnectionStrings__OneDcDb="Host=YOUR_DB_HOST;Database=onedc_production;Username=user;Password=pass"
```

Then in appsettings.Production.json:
```json
{
  "ConnectionStrings": {
    "OneDcDb": "${ConnectionStrings__OneDcDb}"
  }
}
```
