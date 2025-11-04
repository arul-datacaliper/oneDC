-- =====================================================
-- OneDC Default Admin User - READY TO USE
-- =====================================================
-- Created: November 3, 2025
-- Email: admin@onedc.com
-- Password: password123
--
-- IMPORTANT: 
-- 1. Make sure you've run migrations first: dotnet ef database update
-- 2. Run this script to create the default admin user
-- 3. Change the password immediately after first login!
--
-- Usage Examples:
--   # Development database
--   psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev -f insert_admin_ready.sql
--
--   # Production database  
--   psql -h YOUR_PROD_HOST -U YOUR_PROD_USER -d onedc_prod -f insert_admin_ready.sql
--
--   # Or execute directly
--   psql -h 135.233.176.35 -U onedc_dev_user -d onedc_dev
--   \i insert_admin_ready.sql
-- =====================================================

-- Check if admin user already exists
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS (SELECT 1 FROM ts.app_user WHERE email = 'admin@onedc.com') INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE 'Admin user already exists!';
        RAISE NOTICE 'Email: admin@onedc.com';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'To reset the admin user:';
        RAISE NOTICE '  1. Delete existing user: DELETE FROM app_user WHERE email = ''admin@onedc.com'';';
        RAISE NOTICE '  2. Run this script again';
        RAISE NOTICE '';
    ELSE
        -- Insert default admin user with hashed password
        -- Password: password123
        -- Hash generated using PBKDF2-SHA256 with 10000 iterations
        -- Role: 2 = ADMIN (UserRole enum: EMPLOYEE=0, APPROVER=1, ADMIN=2, INFRA=3, HR=4, OPERATION=5)
        -- EmployeeType: 0 = FULL_TIME (EmployeeType enum: FULL_TIME=0, PART_TIME=1, CONTRACT=2, INTERN=3, CONSULTANT=4)
        INSERT INTO ts.app_user (
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
            '10000.+kePeDDR3OcvpU4FUwzqibphcpJuxyXdDgLiYHo2psA=.ORxe13lUDe/elQqCkXhGgOVzd+NRZrOwiRU6a6ET+IE=',
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
        
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '✓ Admin user created successfully!';
        RAISE NOTICE '================================================';
        RAISE NOTICE 'Login Credentials:';
        RAISE NOTICE '  Email: admin@onedc.com';
        RAISE NOTICE '  Password: password123';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: Change this password immediately after first login!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
    END IF;
END $$;

-- Display the admin user details
\echo ''
\echo 'Current Admin User Details:'
\echo '----------------------------'

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
FROM ts.app_user 
WHERE email = 'admin@onedc.com';

\echo ''
\echo 'Done!'
\echo ''
