-- SQL script to recalculate utilization percentages based on 45-hour work week
-- This fixes existing allocations that were calculated with the old 40-hour base

UPDATE ts.weekly_allocation 
SET utilization_percentage = ROUND((allocated_hours::decimal / 45.0) * 100, 2),
    updated_at = NOW()
WHERE utilization_percentage != ROUND((allocated_hours::decimal / 45.0) * 100, 2);

-- Verify the changes
SELECT 
    allocation_id,
    allocated_hours,
    utilization_percentage,
    ROUND((allocated_hours::decimal / 45.0) * 100, 2) as correct_percentage
FROM ts.weekly_allocation 
ORDER BY allocated_hours DESC;
