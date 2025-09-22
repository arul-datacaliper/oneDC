-- SQL Script to Insert Admin User
-- Password: password123
-- Generated using PBKDF2 with 10000 iterations

INSERT INTO ts.app_user (
    user_id,
    employee_id,
    email,
    first_name,
    last_name,
    gender,
    date_of_birth,
    date_of_joining,
    job_title,
    role,
    department,
    employee_type,
    personal_email,
    work_email,
    contact_number,
    emergency_contact_number,
    present_address_line1,
    present_address_line2,
    present_city,
    present_state,
    present_country,
    present_zip_code,
    permanent_address_line1,
    permanent_address_line2,
    permanent_city,
    permanent_state,
    permanent_country,
    permanent_zip_code,
    is_active,
    password_hash,
    manager_id,
    last_login_at,
    created_at
) VALUES (
    'a1b2c3d4-5678-9abc-def0-123456789012'::uuid,  -- user_id
    'EMP001',                                        -- employee_id
    'admin@onedc.local',                            -- email
    'System',                                       -- first_name
    'Administrator',                                -- last_name
    3,                                              -- gender (3 = PREFER_NOT_TO_SAY)
    '1990-01-01',                                   -- date_of_birth
    '2023-01-01',                                   -- date_of_joining
    'System Administrator',                         -- job_title
    2,                                              -- role (2 = ADMIN)
    'IT',                                           -- department
    0,                                              -- employee_type (0 = FULL_TIME)
    'admin.personal@gmail.com',                     -- personal_email
    'admin@onedc.local',                            -- work_email
    '+1-555-0101',                                  -- contact_number
    '+1-555-0102',                                  -- emergency_contact_number
    '123 Admin Street',                             -- present_address_line1
    'Suite 100',                                    -- present_address_line2
    'New York',                                     -- present_city
    'NY',                                           -- present_state
    'USA',                                          -- present_country
    '10001',                                        -- present_zip_code
    '123 Admin Street',                             -- permanent_address_line1
    'Suite 100',                                    -- permanent_address_line2
    'New York',                                     -- permanent_city
    'NY',                                           -- permanent_state
    'USA',                                          -- permanent_country
    '10001',                                        -- permanent_zip_code
    true,                                           -- is_active
    '10000.UDByHDwFd1NuCEqYMa/VInyTFoCTOZG3I9NGbe58NQQ=.h72ZUGCbDrcYXbK3sDkFwb12+tHJVxb8GeYv/ZTyaO4=', -- password_hash for password123
    NULL,                                           -- manager_id
    NULL,                                           -- last_login_at
    NOW()                                           -- created_at
);

-- Note: You need to replace the password_hash with a properly generated PBKDF2 hash
-- The format is: iterations.salt.hash (all base64 encoded)
