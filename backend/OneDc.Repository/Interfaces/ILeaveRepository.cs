using OneDc.Domain.Entities;

namespace OneDc.Repository.Interfaces
{
    public interface ILeaveRepository
    {
        // Employee operations
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByEmployeeIdAsync(Guid employeeId);
        Task<LeaveRequest?> GetLeaveRequestByIdAsync(int id);
        Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequest leaveRequest);
        Task<LeaveRequest> UpdateLeaveRequestAsync(LeaveRequest leaveRequest);
        Task<bool> DeleteLeaveRequestAsync(int id);

        // Approver operations
        Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsAsync();
        Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsByApproverIdAsync(Guid approverId);
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByApproverIdAsync(Guid approverId);
        Task<IEnumerable<LeaveRequest>> GetAllLeaveRequestsAsync();

        // Utility methods
        Task<bool> HasOverlappingLeaveAsync(Guid employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null);
        Task<int> GetApprovedLeaveDaysInYearAsync(Guid employeeId, int year);
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByStatusAsync(string status);

        // Statistics
        Task<Dictionary<string, int>> GetLeaveStatisticsByEmployeeAsync(Guid employeeId, int year);
        Task<Dictionary<string, int>> GetLeaveStatisticsByDepartmentAsync(string department, int year);
    }
}
