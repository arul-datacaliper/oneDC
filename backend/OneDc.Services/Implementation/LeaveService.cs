using Microsoft.Extensions.Logging;
using OneDc.Domain.Entities;
using OneDc.Repository.Interfaces;
using OneDc.Services.Interfaces;

namespace OneDc.Services.Implementation
{
    public class LeaveService : ILeaveService
    {
        private readonly ILeaveRepository _leaveRepository;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<LeaveService> _logger;

        // Leave policies - these could be moved to configuration
        private const int ANNUAL_LEAVE_DAYS_SENIOR = 25; // For employees with 1+ years of service
        private const int ANNUAL_LEAVE_DAYS_JUNIOR = 15; // For employees with less than 1 year of service
        private readonly string[] LEAVE_TYPES = { "Annual", "Sick", "Personal", "Emergency", "Maternity", "Paternity", "Bereavement" };

        public LeaveService(ILeaveRepository leaveRepository, IUserRepository userRepository, ILogger<LeaveService> logger)
        {
            _leaveRepository = leaveRepository;
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequestCreateDto dto)
        {
            // Validate the request with detailed error messages
            var validationResult = await ValidateLeaveRequestWithDetailsAsync(dto);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException(validationResult.ErrorMessage);
            }

            // Get the employee details to find their manager
            var employee = await _userRepository.GetByIdAsync(dto.EmployeeId);
            if (employee == null)
            {
                throw new InvalidOperationException("Employee not found");
            }

            // Check if employee has a manager assigned
            if (employee.ManagerId == null)
            {
                throw new InvalidOperationException("No reporting manager found for the employee. Please contact HR to assign a manager before applying for leave.");
            }

            // Calculate total days
            var totalDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);

            var leaveRequest = new LeaveRequest
            {
                EmployeeId = dto.EmployeeId,
                StartDate = DateTime.SpecifyKind(dto.StartDate.Date, DateTimeKind.Utc),
                EndDate = DateTime.SpecifyKind(dto.EndDate.Date, DateTimeKind.Utc),
                LeaveType = dto.LeaveType,
                Reason = dto.Reason,
                IsHalfDay = dto.IsHalfDay,
                HalfDayPeriod = dto.HalfDayPeriod,
                TotalDays = totalDays,
                Status = "Pending",
                ApproverId = employee.ManagerId, // Set the reporting manager as approver
                CreatedDate = DateTime.UtcNow
            };

            var result = await _leaveRepository.CreateLeaveRequestAsync(leaveRequest);
            _logger.LogInformation("Leave request created with ID: {LeaveRequestId} for employee: {EmployeeId}, assigned to manager: {ManagerId}", result.Id, dto.EmployeeId, employee.ManagerId);
            
            return result;
        }

        public async Task<LeaveRequest> UpdateLeaveRequestAsync(LeaveRequestUpdateDto dto, Guid employeeId)
        {
            var existingRequest = await _leaveRepository.GetLeaveRequestByIdAsync(dto.Id);
            if (existingRequest == null)
            {
                throw new InvalidOperationException("Leave request not found");
            }

            if (existingRequest.EmployeeId != employeeId)
            {
                throw new UnauthorizedAccessException("You can only update your own leave requests");
            }

            if (existingRequest.Status != "Pending")
            {
                throw new InvalidOperationException("Only pending leave requests can be updated");
            }

            // Validate the updated request
            var validationResult = await ValidateLeaveRequestUpdateWithDetailsAsync(dto, employeeId);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException(validationResult.ErrorMessage);
            }

            // Calculate total days
            var totalDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);

            existingRequest.StartDate = DateTime.SpecifyKind(dto.StartDate.Date, DateTimeKind.Utc);
            existingRequest.EndDate = DateTime.SpecifyKind(dto.EndDate.Date, DateTimeKind.Utc);
            existingRequest.LeaveType = dto.LeaveType;
            existingRequest.Reason = dto.Reason;
            existingRequest.IsHalfDay = dto.IsHalfDay;
            existingRequest.HalfDayPeriod = dto.HalfDayPeriod;
            existingRequest.TotalDays = totalDays;
            existingRequest.ModifiedDate = DateTime.UtcNow;

            var result = await _leaveRepository.UpdateLeaveRequestAsync(existingRequest);
            _logger.LogInformation("Leave request updated with ID: {LeaveRequestId} for employee: {EmployeeId}", dto.Id, employeeId);
            
            return result;
        }

        public async Task<bool> DeleteLeaveRequestAsync(int id, Guid employeeId)
        {
            var existingRequest = await _leaveRepository.GetLeaveRequestByIdAsync(id);
            if (existingRequest == null)
            {
                return false;
            }

            if (existingRequest.EmployeeId != employeeId)
            {
                throw new UnauthorizedAccessException("You can only delete your own leave requests");
            }

            if (existingRequest.Status != "Pending")
            {
                throw new InvalidOperationException("Only pending leave requests can be deleted");
            }

            var result = await _leaveRepository.DeleteLeaveRequestAsync(id);
            if (result)
            {
                _logger.LogInformation("Leave request deleted with ID: {LeaveRequestId} for employee: {EmployeeId}", id, employeeId);
            }
            
            return result;
        }

        public async Task<IEnumerable<LeaveRequest>> GetMyLeaveRequestsAsync(Guid employeeId)
        {
            return await _leaveRepository.GetLeaveRequestsByEmployeeIdAsync(employeeId);
        }

        public async Task<LeaveRequest?> GetLeaveRequestByIdAsync(int id)
        {
            return await _leaveRepository.GetLeaveRequestByIdAsync(id);
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsAsync()
        {
            return await _leaveRepository.GetPendingLeaveRequestsAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsByApproverAsync(Guid approverId)
        {
            return await _leaveRepository.GetPendingLeaveRequestsByApproverIdAsync(approverId);
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByApproverAsync(Guid approverId)
        {
            return await _leaveRepository.GetLeaveRequestsByApproverIdAsync(approverId);
        }

        public async Task<LeaveRequest> ApproveOrRejectLeaveAsync(LeaveApprovalDto dto)
        {
            var leaveRequest = await _leaveRepository.GetLeaveRequestByIdAsync(dto.Id);
            if (leaveRequest == null)
            {
                throw new InvalidOperationException("Leave request not found");
            }

            if (leaveRequest.Status != "Pending")
            {
                throw new InvalidOperationException("Only pending leave requests can be approved or rejected");
            }

            if (dto.Status != "Approved" && dto.Status != "Rejected")
            {
                throw new InvalidOperationException("Status must be either 'Approved' or 'Rejected'");
            }

            leaveRequest.Status = dto.Status;
            leaveRequest.ApproverId = dto.ApproverId;
            leaveRequest.ApprovedDate = DateTime.UtcNow;
            leaveRequest.ApproverComments = dto.ApproverComments;
            leaveRequest.ModifiedDate = DateTime.UtcNow;

            var result = await _leaveRepository.UpdateLeaveRequestAsync(leaveRequest);
            _logger.LogInformation("Leave request {Status} with ID: {LeaveRequestId} by approver: {ApproverId}", dto.Status.ToLower(), dto.Id, dto.ApproverId);
            
            return result;
        }

        public async Task<IEnumerable<LeaveRequest>> GetAllLeaveRequestsAsync()
        {
            return await _leaveRepository.GetAllLeaveRequestsAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByEmployeeAsync(Guid employeeId)
        {
            return await _leaveRepository.GetLeaveRequestsByEmployeeIdAsync(employeeId);
        }

        public async Task<bool> ValidateLeaveRequestAsync(LeaveRequestCreateDto dto)
        {
            // Basic validation
            if (dto.StartDate > dto.EndDate)
            {
                return false;
            }

            if (dto.StartDate < DateTime.Today)
            {
                return false;
            }

            if (!LEAVE_TYPES.Contains(dto.LeaveType))
            {
                return false;
            }

            if (dto.IsHalfDay && (dto.EndDate != dto.StartDate))
            {
                return false; // Half day leave can only be for a single day
            }

            if (dto.IsHalfDay && string.IsNullOrEmpty(dto.HalfDayPeriod))
            {
                return false;
            }

            // Check for overlapping leaves
            var hasOverlapping = await _leaveRepository.HasOverlappingLeaveAsync(dto.EmployeeId, dto.StartDate, dto.EndDate);
            if (hasOverlapping)
            {
                return false;
            }

            // Check leave balance
            var employee = await _userRepository.GetByIdAsync(dto.EmployeeId);
            if (employee == null || employee.DateOfJoining == null)
            {
                return false;
            }

            var requestedDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);
            var currentYear = dto.StartDate.Year;
            var balance = await GetLeaveBalanceAsync(dto.EmployeeId, currentYear);
            
            if (requestedDays > balance.RemainingDays)
            {
                return false; // Insufficient leave balance
            }

            return true;
        }

        private async Task<(bool IsValid, string ErrorMessage)> ValidateLeaveRequestWithDetailsAsync(LeaveRequestCreateDto dto)
        {
            // Basic validation
            if (dto.StartDate > dto.EndDate)
            {
                return (false, "Start date cannot be after end date");
            }

            if (dto.StartDate < DateTime.Today)
            {
                return (false, "Cannot apply for leave in the past");
            }

            if (!LEAVE_TYPES.Contains(dto.LeaveType))
            {
                return (false, "Invalid leave type selected");
            }

            if (dto.IsHalfDay && (dto.EndDate != dto.StartDate))
            {
                return (false, "Half day leave can only be for a single day");
            }

            if (dto.IsHalfDay && string.IsNullOrEmpty(dto.HalfDayPeriod))
            {
                return (false, "Half day period must be specified for half day leave");
            }

            // Check for overlapping leaves
            var hasOverlapping = await _leaveRepository.HasOverlappingLeaveAsync(dto.EmployeeId, dto.StartDate, dto.EndDate);
            if (hasOverlapping)
            {
                return (false, "You already have a leave request for the selected dates");
            }

            // Check leave balance
            var employee = await _userRepository.GetByIdAsync(dto.EmployeeId);
            if (employee == null || employee.DateOfJoining == null)
            {
                return (false, "Employee information not found or joining date not available");
            }

            var requestedDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);
            var currentYear = dto.StartDate.Year;
            var balance = await GetLeaveBalanceAsync(dto.EmployeeId, currentYear);
            
            if (requestedDays > balance.RemainingDays)
            {
                _logger.LogWarning($"Leave request exceeds balance: Employee {dto.EmployeeId}, Requested: {requestedDays}, Available: {balance.RemainingDays}");
                // Allow the request to proceed but log the warning
            }

            return (true, string.Empty);
        }

        public async Task<bool> ValidateLeaveRequestAsync(LeaveRequestUpdateDto dto, Guid employeeId)
        {
            // Basic validation
            if (dto.StartDate > dto.EndDate)
            {
                return false;
            }

            if (dto.StartDate < DateTime.Today)
            {
                return false;
            }

            if (!LEAVE_TYPES.Contains(dto.LeaveType))
            {
                return false;
            }

            if (dto.IsHalfDay && (dto.EndDate != dto.StartDate))
            {
                return false; // Half day leave can only be for a single day
            }

            if (dto.IsHalfDay && string.IsNullOrEmpty(dto.HalfDayPeriod))
            {
                return false;
            }

            // Check for overlapping leaves (excluding current request)
            var hasOverlapping = await _leaveRepository.HasOverlappingLeaveAsync(employeeId, dto.StartDate, dto.EndDate, dto.Id);
            if (hasOverlapping)
            {
                return false;
            }

            // Check leave balance (excluding current request)
            var employee = await _userRepository.GetByIdAsync(employeeId);
            if (employee == null || employee.DateOfJoining == null)
            {
                return false;
            }

            var requestedDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);
            var currentYear = dto.StartDate.Year;
            
            // Get current balance and add back the days from the current request being updated
            var balance = await GetLeaveBalanceAsync(employeeId, currentYear);
            var currentRequest = await _leaveRepository.GetLeaveRequestByIdAsync(dto.Id);
            var currentRequestDays = currentRequest?.TotalDays ?? 0;
            
            var availableDays = balance.RemainingDays + currentRequestDays;
            
            if (requestedDays > availableDays)
            {
                return false; // Insufficient leave balance
            }

            return true;
        }

        private async Task<(bool IsValid, string ErrorMessage)> ValidateLeaveRequestUpdateWithDetailsAsync(LeaveRequestUpdateDto dto, Guid employeeId)
        {
            // Basic validation
            if (dto.StartDate > dto.EndDate)
            {
                return (false, "Start date cannot be after end date");
            }

            if (dto.StartDate < DateTime.Today)
            {
                return (false, "Cannot apply for leave in the past");
            }

            if (!LEAVE_TYPES.Contains(dto.LeaveType))
            {
                return (false, "Invalid leave type selected");
            }

            if (dto.IsHalfDay && (dto.EndDate != dto.StartDate))
            {
                return (false, "Half day leave can only be for a single day");
            }

            if (dto.IsHalfDay && string.IsNullOrEmpty(dto.HalfDayPeriod))
            {
                return (false, "Half day period must be specified for half day leave");
            }

            // Check for overlapping leaves (excluding current request)
            var hasOverlapping = await _leaveRepository.HasOverlappingLeaveAsync(employeeId, dto.StartDate, dto.EndDate, dto.Id);
            if (hasOverlapping)
            {
                return (false, "You already have a leave request for the selected dates");
            }

            // Check leave balance (excluding current request)
            var employee = await _userRepository.GetByIdAsync(employeeId);
            if (employee == null || employee.DateOfJoining == null)
            {
                return (false, "Employee information not found or joining date not available");
            }

            var requestedDays = CalculateLeaveDays(dto.StartDate, dto.EndDate, dto.IsHalfDay);
            var currentYear = dto.StartDate.Year;
            
            // Get current balance and add back the days from the current request being updated
            var balance = await GetLeaveBalanceAsync(employeeId, currentYear);
            var currentRequest = await _leaveRepository.GetLeaveRequestByIdAsync(dto.Id);
            var currentRequestDays = currentRequest?.TotalDays ?? 0;
            
            var availableDays = balance.RemainingDays + currentRequestDays;
            
            if (requestedDays > availableDays)
            {
                _logger.LogWarning($"Leave request update exceeds balance: Employee {employeeId}, Requested: {requestedDays}, Available: {availableDays}");
                // Allow the request to proceed but log the warning
            }

            return (true, string.Empty);
        }

        public async Task<LeaveStatisticsDto> GetLeaveStatisticsAsync(Guid employeeId, int year)
        {
            var employee = await _userRepository.GetByIdAsync(employeeId);
            if (employee == null || employee.DateOfJoining == null)
                throw new InvalidOperationException("Employee not found or joining date not available");

            var leaveStats = await _leaveRepository.GetLeaveStatisticsByEmployeeAsync(employeeId, year);
            var approvedDays = await _leaveRepository.GetApprovedLeaveDaysInYearAsync(employeeId, year);
            var entitlement = CalculateLeaveEntitlement(employee.DateOfJoining.Value);

            var statistics = new LeaveStatisticsDto
            {
                TotalLeaves = leaveStats.Values.Sum(),
                ApprovedLeaves = leaveStats.GetValueOrDefault("Approved", 0),
                PendingLeaves = leaveStats.GetValueOrDefault("Pending", 0),
                RejectedLeaves = leaveStats.GetValueOrDefault("Rejected", 0),
                TotalDaysUsed = approvedDays,
                RemainingDays = Math.Max(0, entitlement - approvedDays),
                LeaveTypeBreakdown = new Dictionary<string, int>()
            };

            // Get breakdown by leave type for approved leaves
            var leaveRequests = await _leaveRepository.GetLeaveRequestsByEmployeeIdAsync(employeeId);
            var approvedLeaves = leaveRequests.Where(lr => lr.Status == "Approved" && 
                                                          lr.StartDate.Year == year || lr.EndDate.Year == year);
            
            statistics.LeaveTypeBreakdown = approvedLeaves
                .GroupBy(lr => lr.LeaveType)
                .ToDictionary(g => g.Key, g => g.Sum(lr => lr.TotalDays));

            return statistics;
        }

        public async Task<IEnumerable<LeaveRequest>> GetUpcomingLeavesAsync(int days = 30)
        {
            var startDate = DateTime.SpecifyKind(DateTime.Today, DateTimeKind.Utc);
            var endDate = DateTime.SpecifyKind(DateTime.Today.AddDays(days), DateTimeKind.Utc);
            
            return await _leaveRepository.GetLeaveRequestsByDateRangeAsync(startDate, endDate);
        }

        public async Task<bool> HasOverlappingLeaveAsync(Guid employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null)
        {
            return await _leaveRepository.HasOverlappingLeaveAsync(employeeId, startDate, endDate, excludeRequestId);
        }

        public async Task<IEnumerable<string>> GetLeaveTypesAsync()
        {
            return await Task.FromResult(LEAVE_TYPES);
        }

        public async Task<int> GetRemainingLeaveDaysAsync(Guid employeeId, int year)
        {
            var employee = await _userRepository.GetByIdAsync(employeeId);
            if (employee == null || employee.DateOfJoining == null)
                throw new InvalidOperationException("Employee not found or joining date not available");

            var entitlement = CalculateLeaveEntitlement(employee.DateOfJoining.Value);
            var usedDays = await _leaveRepository.GetApprovedLeaveDaysInYearAsync(employeeId, year);
            return Math.Max(0, entitlement - usedDays);
        }

        public async Task<LeaveBalanceDto> GetLeaveBalanceAsync(Guid employeeId, int year)
        {
            var employee = await _userRepository.GetByIdAsync(employeeId);
            if (employee == null || employee.DateOfJoining == null)
                throw new InvalidOperationException("Employee not found or joining date not available");

            var entitlement = CalculateLeaveEntitlement(employee.DateOfJoining.Value);
            var yearsOfService = CalculateYearsOfService(employee.DateOfJoining.Value);
            
            // Get approved leave days for the year
            var approvedDays = await _leaveRepository.GetApprovedLeaveDaysInYearAsync(employeeId, year);
            
            // Calculate pending days by getting all pending leaves and filtering by year
            var allLeaves = await _leaveRepository.GetLeaveRequestsByEmployeeIdAsync(employeeId);
            var pendingDays = allLeaves
                .Where(lr => lr.Status == "Pending" && lr.StartDate.Year == year)
                .Sum(lr => lr.TotalDays);
            
            return new LeaveBalanceDto
            {
                TotalEntitlement = entitlement,
                UsedDays = approvedDays,
                PendingDays = pendingDays,
                RemainingDays = Math.Max(0, entitlement - approvedDays - pendingDays),
                JoiningDate = employee.DateOfJoining.Value.ToString("yyyy-MM-dd"),
                YearsOfService = yearsOfService,
                CurrentYear = year
            };
        }

        private int CalculateLeaveEntitlement(DateOnly joiningDate)
        {
            var yearsOfService = CalculateYearsOfService(joiningDate);
            var entitlement = yearsOfService >= 1 ? ANNUAL_LEAVE_DAYS_SENIOR : ANNUAL_LEAVE_DAYS_JUNIOR;
            
            _logger.LogInformation($"Calculating leave entitlement: Years={yearsOfService}, Entitlement={entitlement}");
            
            return entitlement;
        }

        private int CalculateYearsOfService(DateOnly joiningDate)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            
            // Calculate the difference in years
            var years = today.Year - joiningDate.Year;
            
            // If the anniversary hasn't occurred this year, subtract 1
            var anniversaryThisYear = joiningDate.AddYears(years);
            if (today < anniversaryThisYear)
            {
                years--;
            }
            
            var result = Math.Max(0, years);
            
            _logger.LogInformation($"Calculating years of service: Joining={joiningDate}, Today={today}, Anniversary={anniversaryThisYear}, Years={result}");
            
            return result;
        }

        private int CalculateLeaveDays(DateTime startDate, DateTime endDate, bool isHalfDay)
        {
            if (isHalfDay)
            {
                return 1; // Half day is still counted as 1 day but can be handled differently in UI
            }

            var totalDays = 0;
            var currentDate = startDate.Date;

            while (currentDate <= endDate.Date)
            {
                // Only count weekdays (Monday to Friday)
                if (currentDate.DayOfWeek != DayOfWeek.Saturday && currentDate.DayOfWeek != DayOfWeek.Sunday)
                {
                    totalDays++;
                }
                currentDate = currentDate.AddDays(1);
            }

            return totalDays;
        }
    }
}
