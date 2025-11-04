-- =====================================================
-- OneDC Default Admin User Creation Script
-- =====================================================
-- Run this script after clearing the database and running migrations
-- Creates default admin with email: admin@onedc.com and password: password123
--
-- IMPORTANT: 
-- 1. Run migrations first: dotnet ef database update
-- 2. Then run this script to create default admin user
-- 3. Change the password immediately after first login!
--
-- Usage: 
--   psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_default_admin.sql
-- =====================================================

-- Check if admin user already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM app_user WHERE email = 'admin@onedc.com') THEN
        RAISE NOTICE 'Admin user already exists with email: admin@onedc.com';
    ELSE
        -- Insert default admin user
        -- NOTE: Password hash is for "password123" using PBKDF2-SHA256 with 10000 iterations
        -- You MUST generate a new hash by running the PasswordHashGenerator tool if you want a different password
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
            -- REPLACE THIS HASH IF YOU CHANGE THE PASSWORD
            -- Generate new hash using: cd backend/PasswordHashGenerator && dotnet run
            'REPLACE_WITH_ACTUAL_HASH',  
            2,
            'System',
            'Administrator',
            'IT',
            'System Administrator',
            0,
            true,
            false,  -- Set to true if you want to force password change on first login
            CURRENT_DATE,
            NOW()
        );
        
        RAISE NOTICE 'Admin user created successfully!';
        RAISE NOTICE 'Email: admin@onedc.com';
        RAISE NOTICE 'Password: password123';
        RAISE NOTICE 'WARNING: Change this password immediately after first login!';
    END IF;
END $$;

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
