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
        private const int ANNUAL_LEAVE_DAYS = 25;
        private readonly string[] LEAVE_TYPES = { "Annual", "Sick", "Personal", "Emergency", "Maternity", "Paternity", "Bereavement" };

        public LeaveService(ILeaveRepository leaveRepository, IUserRepository userRepository, ILogger<LeaveService> logger)
        {
            _leaveRepository = leaveRepository;
            _userRepository = userRepository;
            _logger = logger;
        }

        public async Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequestCreateDto dto)
        {
            // Validate the request
            var isValid = await ValidateLeaveRequestAsync(dto);
            if (!isValid)
            {
                throw new InvalidOperationException("Invalid leave request");
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
            var isValid = await ValidateLeaveRequestAsync(dto, employeeId);
            if (!isValid)
            {
                throw new InvalidOperationException("Invalid leave request update");
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

            return true;
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

            return true;
        }

        public async Task<LeaveStatisticsDto> GetLeaveStatisticsAsync(Guid employeeId, int year)
        {
            var leaveStats = await _leaveRepository.GetLeaveStatisticsByEmployeeAsync(employeeId, year);
            var approvedDays = await _leaveRepository.GetApprovedLeaveDaysInYearAsync(employeeId, year);

            var statistics = new LeaveStatisticsDto
            {
                TotalLeaves = leaveStats.Values.Sum(),
                ApprovedLeaves = leaveStats.GetValueOrDefault("Approved", 0),
                PendingLeaves = leaveStats.GetValueOrDefault("Pending", 0),
                RejectedLeaves = leaveStats.GetValueOrDefault("Rejected", 0),
                TotalDaysUsed = approvedDays,
                RemainingDays = Math.Max(0, ANNUAL_LEAVE_DAYS - approvedDays),
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
            var usedDays = await _leaveRepository.GetApprovedLeaveDaysInYearAsync(employeeId, year);
            return Math.Max(0, ANNUAL_LEAVE_DAYS - usedDays);
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
