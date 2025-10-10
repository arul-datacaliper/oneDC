using OneDc.Domain.Entities;

namespace OneDc.Services.Interfaces
{
    public class LeaveRequestCreateDto
    {
        public Guid EmployeeId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; } = null!;
        public string? Reason { get; set; }
        public bool IsHalfDay { get; set; } = false;
        public string? HalfDayPeriod { get; set; }
    }

    public class LeaveRequestUpdateDto
    {
        public int Id { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string LeaveType { get; set; } = null!;
        public string? Reason { get; set; }
        public bool IsHalfDay { get; set; } = false;
        public string? HalfDayPeriod { get; set; }
    }

    public class LeaveApprovalDto
    {
        public int Id { get; set; }
        public string Status { get; set; } = null!; // Approved, Rejected
        public string? ApproverComments { get; set; }
        public Guid ApproverId { get; set; }
    }

    public class LeaveStatisticsDto
    {
        public int TotalLeaves { get; set; }
        public int ApprovedLeaves { get; set; }
        public int PendingLeaves { get; set; }
        public int RejectedLeaves { get; set; }
        public int TotalDaysUsed { get; set; }
        public int RemainingDays { get; set; }
        public Dictionary<string, int> LeaveTypeBreakdown { get; set; } = new();
    }

    public interface ILeaveService
    {
        // Employee operations
        Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequestCreateDto dto);
        Task<LeaveRequest> UpdateLeaveRequestAsync(LeaveRequestUpdateDto dto, Guid employeeId);
        Task<bool> DeleteLeaveRequestAsync(int id, Guid employeeId);
        Task<IEnumerable<LeaveRequest>> GetMyLeaveRequestsAsync(Guid employeeId);
        Task<LeaveRequest?> GetLeaveRequestByIdAsync(int id);

        // Approver operations
        Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsAsync();
        Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsByApproverAsync(Guid approverId);
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByApproverAsync(Guid approverId);
        Task<LeaveRequest> ApproveOrRejectLeaveAsync(LeaveApprovalDto dto);

        // Admin operations
        Task<IEnumerable<LeaveRequest>> GetAllLeaveRequestsAsync();
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByEmployeeAsync(Guid employeeId);

        // Utility operations
        Task<bool> ValidateLeaveRequestAsync(LeaveRequestCreateDto dto);
        Task<bool> ValidateLeaveRequestAsync(LeaveRequestUpdateDto dto, Guid employeeId);
        Task<LeaveStatisticsDto> GetLeaveStatisticsAsync(Guid employeeId, int year);
        Task<IEnumerable<LeaveRequest>> GetUpcomingLeavesAsync(int days = 30);
        Task<bool> HasOverlappingLeaveAsync(Guid employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null);

        // Leave types and policies
        Task<IEnumerable<string>> GetLeaveTypesAsync();
        Task<int> GetRemainingLeaveDaysAsync(Guid employeeId, int year);
    }
}
