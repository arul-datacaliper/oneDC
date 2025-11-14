-- Check for Arul guru's leave data around 12/11
SELECT 
    u.first_name,
    u.last_name,
    lr.start_date,
    lr.end_date,
    lr.status,
    lr.is_half_day,
    lr.leave_type,
    lr.reason
FROM leave_requests lr
JOIN app_users u ON lr.employee_id = u.user_id
WHERE (u.first_name ILIKE '%arul%' OR u.last_name ILIKE '%guru%')
  AND lr.start_date >= '2024-11-10'
  AND lr.end_date <= '2024-11-15'
ORDER BY lr.start_date;

-- Also check all approved leaves for this week
SELECT 
    u.first_name,
    u.last_name,
    lr.start_date,
    lr.end_date,
    lr.status,
    lr.is_half_day,
    lr.leave_type
FROM leave_requests lr
JOIN app_users u ON lr.employee_id = u.user_id
WHERE lr.status = 'Approved'
  AND lr.start_date <= '2024-11-16'
  AND lr.end_date >= '2024-11-10'
ORDER BY u.first_name, lr.start_date;
