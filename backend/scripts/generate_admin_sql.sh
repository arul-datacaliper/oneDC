#!/bin/bash

# Script to generate password hash and create SQL script with admin user
# Usage: ./generate_admin_sql.sh [password]

PASSWORD=${1:-password123}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUTPUT_FILE="$SCRIPT_DIR/insert_admin_with_hash.sql"

echo "Generating password hash for: $PASSWORD"
echo "=================================="

# Run the PasswordHashGenerator
cd "$SCRIPT_DIR/../PasswordHashGenerator"
HASH=$(dotnet run "$PASSWORD" 2>/dev/null | grep -A 1 "Use this hash" | tail -1 | tr -d "'")

if [ -z "$HASH" ]; then
    echo "ERROR: Failed to generate password hash"
    echo "Make sure you're running this from the backend/scripts directory"
    exit 1
fi

echo "Generated hash: $HASH"
echo ""
echo "Creating SQL script: $OUTPUT_FILE"

# Create the SQL script with the actual hash
cat > "$OUTPUT_FILE" << EOF
-- =====================================================
-- OneDC Default Admin User Creation Script
-- =====================================================
-- Auto-generated on: $(date)
-- Email: admin@onedc.com
-- Password: $PASSWORD
--
-- IMPORTANT: Change the password immediately after first login!
--
-- Usage: 
--   psql -h HOST -U USER -d DATABASE -f insert_admin_with_hash.sql
-- =====================================================

-- Check if admin user already exists
DO \$\$
BEGIN
    IF EXISTS (SELECT 1 FROM app_user WHERE email = 'admin@onedc.com') THEN
        RAISE NOTICE 'Admin user already exists with email: admin@onedc.com';
        RAISE NOTICE 'To reset password, delete the user first:';
        RAISE NOTICE 'DELETE FROM app_user WHERE email = ''admin@onedc.com'';';
    ELSE
        -- Insert default admin user
        -- Role: 2 = ADMIN (UserRole enum: EMPLOYEE=0, APPROVER=1, ADMIN=2, INFRA=3, HR=4, OPERATION=5)
        -- EmployeeType: 0 = FULL_TIME (EmployeeType enum: FULL_TIME=0, PART_TIME=1, CONTRACT=2, INTERN=3, CONSULTANT=4)
        INSERT INTO app_user (
            user_id,
            employee_id,
            email,
            work_email,
            password_hash,
            role,
            first_name,
            last_name,
            department,
            job_title,
            employee_type,
            is_active,
            must_change_password,
            date_of_joining,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'EMP001',
            'admin@onedc.com',
            'admin@onedc.com',
            '$HASH',
            2,
            'System',
            'Administrator',
            'IT',
            'System Administrator',
            0,
            true,
            false,
            CURRENT_DATE,
            NOW()
        );
        
        RAISE NOTICE 'Admin user created successfully!';
        RAISE NOTICE '===================================';
        RAISE NOTICE 'Email: admin@onedc.com';
        RAISE NOTICE 'Password: $PASSWORD';
        RAISE NOTICE 'WARNING: Change this password immediately after first login!';
        RAISE NOTICE '===================================';
    END IF;
END \$\$;

-- Display the created user
SELECT 
    user_id, 
    employee_id,
    email, 
    role, 
    first_name, 
    last_name, 
    department,
    job_title,
    is_active,
    must_change_password,
    created_at 
FROM app_user 
WHERE email = 'admin@onedc.com';
EOF

echo "=================================="
echo "✓ SQL script created successfully!"
echo ""
echo "To insert the admin user, run:"
echo "  psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f $OUTPUT_FILE"
echo ""
echo "Or copy and paste the SQL commands from: $OUTPUT_FILE"
echo ""
echo "Login credentials:"
echo "  Email: admin@onedc.com"
echo "  Password: $PASSWORD"
echo ""
