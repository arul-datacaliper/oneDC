# Database Scripts

This directory contains SQL scripts and utilities for managing the oneDC database.

## Quick Start - Create Default Admin

### Option 1: Use Ready-Made Script (Fastest)

```bash
# Connect to your database and run the script
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_ready.sql
```

**Default Credentials:**
- Email: `admin@onedc.com`
- Password: `password123`

⚠️ **Change the password immediately after first login!**

### Option 2: Generate Custom Password

If you want a different password:

```bash
# Make the script executable
chmod +x generate_admin_sql.sh

# Generate with custom password
./generate_admin_sql.sh "YourCustomPassword123"

# This creates: insert_admin_with_hash.sql
# Then run it:
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_with_hash.sql
```

---

## Available Scripts

### 1. `insert_admin_ready.sql` ✨ **RECOMMENDED**
**Ready-to-use script with pre-generated password hash**

- Email: `admin@onedc.com`
- Password: `password123`
- No compilation needed
- Just run and go!

**Usage:**
```bash
psql -h HOST -U USER -d DATABASE -f insert_admin_ready.sql
```

**Example for Dev:**
```bash
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_ready.sql
```

**Example for Prod:**
```bash
psql -h YOUR_PROD_HOST -U onedc_prod_user -d onedc_prod -f insert_admin_ready.sql
```

### 2. `generate_admin_sql.sh`
**Script to generate admin SQL with custom password**

Creates a new SQL file with password hash for your chosen password.

**Usage:**
```bash
./generate_admin_sql.sh [password]

# Examples:
./generate_admin_sql.sh                    # Uses default: password123
./generate_admin_sql.sh MySecurePass456    # Custom password
./generate_admin_sql.sh "P@ssw0rd!"        # Use quotes for special characters
```

**Output:**
- Creates: `insert_admin_with_hash.sql`
- Shows the SQL command to run

### 3. `insert_default_admin.sql`
**Template file** - Needs manual hash replacement

Not recommended for direct use. Use `insert_admin_ready.sql` or `generate_admin_sql.sh` instead.

---

## Common Tasks

### Check if Admin Exists

```sql
SELECT email, first_name, last_name, role, is_active 
FROM app_user 
WHERE email = 'admin@onedc.com';
```

### Delete Existing Admin (to recreate)

```sql
DELETE FROM app_user WHERE email = 'admin@onedc.com';
```

Then run the insert script again.

### Change Admin Password (via SQL)

Don't do this manually! Use one of these methods instead:

**Option A: Delete and recreate**
```bash
# 1. Delete old admin
psql -h HOST -U USER -d DATABASE -c "DELETE FROM \"AppUsers\" WHERE \"Email\" = 'admin@onedc.com';"

# 2. Run insert script
psql -h HOST -U USER -d DATABASE -f insert_admin_ready.sql
```

**Option B: Use the application**
1. Login with current password
2. Go to Profile → Change Password
3. Follow the prompts

---

## PostgreSQL Table Name

The actual table name in the database is: **`app_user`** (snake_case)

Not `AppUsers` (PascalCase) - Entity Framework maps this automatically in the application code.

### Enum Values

The database stores enums as integers:

**UserRole:**
- `0` = EMPLOYEE
- `1` = APPROVER
- `2` = ADMIN
- `3` = INFRA
- `4` = HR
- `5` = OPERATION

**EmployeeType:**
- `0` = FULL_TIME
- `1` = PART_TIME
- `2` = CONTRACT
- `3` = INTERN
- `4` = CONSULTANT

---

## Database Connection Examples

### Development Database
```bash
# Environment variables
export PGHOST=135.233.176.35
export PGUSER=onedc_dev_user
export PGDATABASE=onedc_dev
export PGPASSWORD=OnedcDevUser@1234

# Connect
psql

# Or in one command
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev
```

### Production Database
```bash
# Environment variables (update with your production values)
export PGHOST=YOUR_PROD_HOST
export PGUSER=onedc_prod_user
export PGDATABASE=onedc_prod
export PGPASSWORD=YOUR_PROD_PASSWORD

# Connect
psql
```

---

## Troubleshooting

### "Admin user already exists"

The script checks for existing admin before inserting. If you see this message:

1. **Keep the existing admin** - Just use the current password
2. **Reset the admin** - Delete and recreate:
   ```bash
   psql -h HOST -U USER -d DATABASE -c "DELETE FROM \"AppUsers\" WHERE \"Email\" = 'admin@onedc.com';"
   psql -h HOST -U USER -d DATABASE -f insert_admin_ready.sql
   ```

### "Permission denied"

Make sure:
1. You have correct database credentials
2. Your IP is allowed to connect to the database
3. The database user has permission to INSERT into AppUsers table

### "Table AppUsers does not exist"

Run migrations first:
```bash
cd backend/OneDc.Api
dotnet ef database update
```

### "generate_admin_sql.sh: command not found"

Make the script executable:
```bash
chmod +x generate_admin_sql.sh
./generate_admin_sql.sh
```

### Cannot generate password hash

The `generate_admin_sql.sh` script requires:
1. .NET SDK installed
2. Running from `backend/scripts/` directory
3. PasswordHashGenerator project exists in `backend/PasswordHashGenerator/`

If issues persist, use the ready-made script instead: `insert_admin_ready.sql`

---

## Password Hash Format

OneDC uses **PBKDF2-SHA256** for password hashing with the following format:

```
{iterations}.{base64_salt}.{base64_hash}
```

Example:
```
10000.+kePeDDR3OcvpU4FUwzqibphcpJuxyXdDgLiYHo2psA=.ORxe13lUDe/elQqCkXhGgOVzd+NRZrOwiRU6a6ET+IE=
```

- **Iterations:** 10,000 (fixed)
- **Salt:** 32 bytes (random, Base64 encoded)
- **Hash:** 32 bytes (PBKDF2-SHA256 output, Base64 encoded)

---

## Security Best Practices

### Development
- ✅ Use the default password (`password123`) for quick setup
- ✅ It's okay to commit `insert_admin_ready.sql` (dev credentials)
- ⚠️ Still change password after first login

### Production
- ✅ Generate a **strong unique password** using `generate_admin_sql.sh`
- ✅ Use minimum 16 characters with mixed case, numbers, symbols
- ✅ **Never commit production SQL files** (add to .gitignore)
- ✅ Store production password in secure password manager
- ✅ Enable `MustChangePassword=true` for first login
- ✅ Set up 2FA if available

### Example Production Setup
```bash
# Generate with strong password
./generate_admin_sql.sh "MyV3ry$ecur3P@ssw0rd!2024"

# Copy the generated file to production server
scp insert_admin_with_hash.sql user@prod-server:/tmp/

# SSH to production server and run
ssh user@prod-server
psql -h prod-db-host -U prod_user -d onedc_prod -f /tmp/insert_admin_with_hash.sql

# Delete the file after use
rm /tmp/insert_admin_with_hash.sql
```

---

## Need Different Default Values?

If you need to change default admin details (name, department, etc.):

1. Edit `insert_admin_ready.sql` or `generate_admin_sql.sh`
2. Modify the INSERT statement values:
   - `FirstName`, `LastName` - Admin name
   - `Department` - Default: "IT"
   - `JobTitle` - Default: "System Administrator"
   - `EmployeeId` - Default: "EMP001"
   - `MustChangePassword` - Set to `true` to force password change

---

## Related Documentation

- [Production Setup Guide](../../docs/PRODUCTION_SETUP_GUIDE.md)
- [Admin User Guide](../../docs/USER_GUIDE_ADMIN.md)
- [Database Migration Guide](../README.md)

---

**Last Updated:** November 2025  
**Maintained by:** OneDC DevOps Team
