-- Script to update empty Employee IDs with proper values
-- This script handles users who might have empty Employee IDs after the migration

-- First, check how many users have empty Employee IDs
SELECT COUNT(*) as empty_employee_ids_count 
FROM ts.app_user 
WHERE employee_id = '';

-- Show the users with empty Employee IDs
SELECT user_id, first_name, last_name, work_email, employee_id, created_at
FROM ts.app_user 
WHERE employee_id = ''
ORDER BY created_at;

-- Update empty Employee IDs with generated values
-- This generates Employee IDs in the format EMP001, EMP002, etc.
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
    new_emp_id VARCHAR(20);
BEGIN
    -- Loop through users with empty Employee IDs
    FOR rec IN 
        SELECT user_id, first_name, last_name
        FROM ts.app_user 
        WHERE employee_id = ''
        ORDER BY created_at
    LOOP
        -- Generate new Employee ID
        LOOP
            new_emp_id := 'EMP' || LPAD(counter::TEXT, 3, '0');
            
            -- Check if this Employee ID already exists
            IF NOT EXISTS (SELECT 1 FROM ts.app_user WHERE employee_id = new_emp_id) THEN
                EXIT;
            END IF;
            
            counter := counter + 1;
        END LOOP;
        
        -- Update the user with the new Employee ID
        UPDATE ts.app_user 
        SET employee_id = new_emp_id 
        WHERE user_id = rec.user_id;
        
        RAISE NOTICE 'Updated user % % with Employee ID %', rec.first_name, rec.last_name, new_emp_id;
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Verify the updates
SELECT COUNT(*) as empty_employee_ids_count_after_update 
FROM ts.app_user 
WHERE employee_id = '';

-- Show all Employee IDs to verify uniqueness
SELECT employee_id, first_name, last_name, work_email
FROM ts.app_user 
WHERE employee_id != ''
ORDER BY employee_id;
