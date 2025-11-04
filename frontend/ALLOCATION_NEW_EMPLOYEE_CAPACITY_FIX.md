# Fix: New Employee Capacity Shows Full Week Instead of Selected Date Range

## Issue
When adding a new employee to an allocation using the dropdown, their weekly capacity displayed the full week capacity (45h) instead of calculating it based on the selected start and end dates. 

However, employees who were auto-loaded (project members or employees with existing allocations) showed the correct capacity based on the selected date range.

**Example**:
- Selected dates: Nov 4-5 (2 days)
- Expected capacity: ~18 hours (2 days × 9h)
- Auto-loaded members: ✅ Show 18h correctly
- Manually added members: ❌ Show 45h (full week)

## Root Cause
In the `addEmployeeAllocation()` method (line 829), when a new employee was added via dropdown:
1. The employee was added to `selectedEmployeeAllocations`
2. **BUT** their weekly capacity was NOT loaded for the selected date range
3. The UI tried to display capacity, but since it wasn't loaded, it may have shown default/cached full week capacity

In contrast, when employees were auto-loaded via `autoAddProjectMembers()` (line 410):
- The code explicitly called `getWeeklyCapacity(weekStartDate, weekEndDate, userIdsArray)`
- This loaded capacity **based on the selected date range**, not the full week

## Solution
Modified the `addEmployeeAllocation()` method to load weekly capacity for newly added employees based on the selected start and end dates from the form.

**File**: `frontend/onedc/src/app/features/allocations/allocations.component.ts`

**Change**: Added capacity loading after employee is added to the list

```typescript
// Add employee to allocation list
addEmployeeAllocation(userId: string) {
  console.log('addEmployeeAllocation called with userId:', userId);
  const employee = this.availableEmployees().find(emp => emp.userId === userId);
  console.log('Found employee:', employee);
  if (employee) {
    const newEmployeeAllocation: EmployeeAllocation = {
      userId: employee.userId,
      userName: employee.userName,
      allocatedHours: 0
    };

    // Initialize periodHours if multi-month week is detected
    if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
      newEmployeeAllocation.periodHours = new Array(this.monthPeriods().length).fill(0);
    }

    console.log('Adding employee allocation:', newEmployeeAllocation);
    this.selectedEmployeeAllocations.update(current => [...current, newEmployeeAllocation]);
    this.updateAvailableEmployeesForSelection();
    console.log('Updated selectedEmployeeAllocations:', this.selectedEmployeeAllocations());
    
    // ✅ NEW: Load weekly capacity for the newly added employee based on selected date range
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;
    if (weekStartDate && weekEndDate) {
      this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, [userId]).subscribe({
        next: (capacities) => {
          if (capacities && capacities.length > 0) {
            const capacity = capacities[0];
            this.weeklyCapacities.update(current => {
              const newMap = new Map(current);
              newMap.set(capacity.userId, capacity);
              return newMap;
            });
            console.log('Loaded capacity for new employee:', capacity);
          }
        },
        error: (error) => {
          console.error('Error fetching weekly capacity for new employee:', error);
        }
      });
    }
  }
}
```

## Key Changes
1. **Get form dates**: Extract `weekStartDate` and `weekEndDate` from the allocation form
2. **Call API**: Use `allocationService.getWeeklyCapacity()` with the selected date range
3. **Update capacity map**: Store the capacity in `weeklyCapacities` signal so the UI displays it correctly

## Result
Now when you add a new employee via dropdown:
- ✅ Their capacity is calculated **based on selected start/end dates**
- ✅ If you select 2 days (Nov 4-5), capacity shows ~18h
- ✅ If you select 5 days (Nov 4-8), capacity shows ~45h
- ✅ Consistent with auto-loaded project members

## Testing Scenarios

### Scenario 1: Add New Member with 2-Day Range
1. Open "New Allocation" modal
2. Select project
3. Select dates: Nov 4 (Monday) to Nov 5 (Tuesday) - 2 days
4. Note existing members show ~18h capacity
5. Add new employee from dropdown
6. ✅ New employee should also show ~18h capacity (not 45h)

### Scenario 2: Add New Member with 5-Day Range
1. Open "New Allocation" modal
2. Select project
3. Select dates: Nov 4 to Nov 8 - 5 days (full work week)
4. Note existing members show ~45h capacity
5. Add new employee from dropdown
6. ✅ New employee should show ~45h capacity

### Scenario 3: Multi-Month Week
1. Open "New Allocation" modal
2. Select dates spanning two months (e.g., Jan 29 - Feb 4)
3. Note month periods are shown (e.g., Jan: 3 days, Feb: 2 days)
4. Add new employee from dropdown
5. ✅ New employee capacity calculated correctly for the total range

### Scenario 4: Change Dates After Adding Employee
1. Open modal, select dates (e.g., 2 days)
2. Add employee A (shows 18h capacity)
3. Change end date to extend range (e.g., 5 days)
4. Add employee B
5. ✅ Employee B should show 45h capacity (new range)
6. ❌ Employee A still shows 18h (old range) ← Known behavior, capacity loaded on add

**Note**: Currently, capacities are loaded when employee is added. If dates change after adding employees, their displayed capacity won't update automatically. This is acceptable since users typically:
- Set dates first
- Then add employees
- Submit form

If needed in future, we could re-load all capacities when dates change (add listener to weekStartDate/weekEndDate changes).

## Impact
- **User Experience**: ✅ Improved - Shows accurate capacity based on selected dates
- **Data Accuracy**: ✅ Improved - Prevents confusion about available capacity
- **Performance**: ✅ Minimal impact - Only one API call per added employee
- **Backward Compatibility**: ✅ No breaking changes - Existing auto-load behavior unchanged

## Related Code
- **Auto-load capacity**: `autoAddProjectMembers()` method (line ~410)
- **Get capacity details**: `getFormattedCapacity()` method
- **Capacity API**: `AllocationService.getWeeklyCapacity()`

## Future Enhancements
1. **Real-time capacity update**: Re-load all capacities when start/end dates change
2. **Capacity caching**: Cache capacity data to avoid redundant API calls
3. **Batch capacity loading**: If adding multiple employees, batch the API call
4. **Visual indicator**: Show loading spinner while capacity is being fetched for new employee

---
**Created**: November 4, 2025  
**Issue**: New employee capacity shows full week (45h) instead of selected date range  
**Fix**: Load capacity based on form's selected start/end dates when employee is added  
**Status**: ✅ Fixed - Ready for Testing
