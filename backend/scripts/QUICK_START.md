# 🚀 Quick Reference: Create Admin User

## ONE COMMAND - READY TO USE! ✨

```bash
cd /Users/arul/oneDC/MVP-ver1/oneDC/backend/scripts
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_ready.sql
```

**Login:**
- Email: `admin@onedc.com`
- Password: `password123`

---

## That's it! 🎉

The script will:
- ✅ Check if admin already exists (won't duplicate)
- ✅ Create admin user with proper password hash
- ✅ Show you the created user details
- ✅ Display login credentials

---

## What if Admin Already Exists?

### Option 1: Use Existing Admin
Just login with the existing credentials.

### Option 2: Reset Admin
```bash
# Delete and recreate
psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -c "DELETE FROM \"AppUsers\" WHERE \"Email\" = 'admin@onedc.com';"

psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_ready.sql
```

---

## For Production Database

```bash
# Update these values for your production database
psql -h YOUR_PROD_HOST -U onedc_prod_user -d onedc_prod -f insert_admin_ready.sql
```

⚠️ **Important:** Generate a strong unique password for production!

```bash
./generate_admin_sql.sh "StrongProductionPassword123!"
psql -h YOUR_PROD_HOST -U onedc_prod_user -d onedc_prod -f insert_admin_with_hash.sql
```

---

## Need Help?

See: [backend/scripts/README.md](./README.md) for full documentation
