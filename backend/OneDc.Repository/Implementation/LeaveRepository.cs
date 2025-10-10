using Microsoft.EntityFrameworkCore;
using OneDc.Domain.Entities;
using OneDc.Infrastructure;
using OneDc.Repository.Interfaces;

namespace OneDc.Repository.Implementation
{
    public class LeaveRepository : ILeaveRepository
    {
        private readonly OneDcDbContext _context;

        public LeaveRepository(OneDcDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByEmployeeIdAsync(Guid employeeId)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .Where(lr => lr.EmployeeId == employeeId)
                .OrderByDescending(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<LeaveRequest?> GetLeaveRequestByIdAsync(int id)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .FirstOrDefaultAsync(lr => lr.Id == id);
        }

        public async Task<LeaveRequest> CreateLeaveRequestAsync(LeaveRequest leaveRequest)
        {
            leaveRequest.CreatedDate = DateTime.UtcNow;
            _context.LeaveRequests.Add(leaveRequest);
            await _context.SaveChangesAsync();
            return leaveRequest;
        }

        public async Task<LeaveRequest> UpdateLeaveRequestAsync(LeaveRequest leaveRequest)
        {
            leaveRequest.ModifiedDate = DateTime.UtcNow;
            _context.LeaveRequests.Update(leaveRequest);
            await _context.SaveChangesAsync();
            return leaveRequest;
        }

        public async Task<bool> DeleteLeaveRequestAsync(int id)
        {
            var leaveRequest = await _context.LeaveRequests.FindAsync(id);
            if (leaveRequest == null)
                return false;

            _context.LeaveRequests.Remove(leaveRequest);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingLeaveRequestsAsync()
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .Where(lr => lr.Status == "Pending")
                .OrderBy(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByApproverIdAsync(Guid approverId)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .Where(lr => lr.ApproverId == approverId)
                .OrderByDescending(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetAllLeaveRequestsAsync()
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .OrderByDescending(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<bool> HasOverlappingLeaveAsync(Guid employeeId, DateTime startDate, DateTime endDate, int? excludeRequestId = null)
        {
            var query = _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId &&
                           lr.Status == "Approved" &&
                           ((lr.StartDate <= endDate && lr.EndDate >= startDate)));

            if (excludeRequestId.HasValue)
            {
                query = query.Where(lr => lr.Id != excludeRequestId.Value);
            }

            return await query.AnyAsync();
        }

        public async Task<int> GetApprovedLeaveDaysInYearAsync(Guid employeeId, int year)
        {
            var startOfYear = DateTime.SpecifyKind(new DateTime(year, 1, 1), DateTimeKind.Utc);
            var endOfYear = DateTime.SpecifyKind(new DateTime(year, 12, 31), DateTimeKind.Utc);

            var approvedLeaves = await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId &&
                           lr.Status == "Approved" &&
                           lr.StartDate >= startOfYear &&
                           lr.EndDate <= endOfYear)
                .ToListAsync();

            return approvedLeaves.Sum(lr => lr.TotalDays);
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .Where(lr => lr.StartDate >= startDate && lr.EndDate <= endDate)
                .OrderByDescending(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetLeaveRequestsByStatusAsync(string status)
        {
            return await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Include(lr => lr.Approver)
                .Where(lr => lr.Status == status)
                .OrderByDescending(lr => lr.CreatedDate)
                .ToListAsync();
        }

        public async Task<Dictionary<string, int>> GetLeaveStatisticsByEmployeeAsync(Guid employeeId, int year)
        {
            var startOfYear = DateTime.SpecifyKind(new DateTime(year, 1, 1), DateTimeKind.Utc);
            var endOfYear = DateTime.SpecifyKind(new DateTime(year, 12, 31), DateTimeKind.Utc);

            var leaveRequests = await _context.LeaveRequests
                .Where(lr => lr.EmployeeId == employeeId &&
                           lr.StartDate >= startOfYear &&
                           lr.EndDate <= endOfYear)
                .ToListAsync();

            return leaveRequests
                .GroupBy(lr => lr.Status)
                .ToDictionary(g => g.Key, g => g.Sum(lr => lr.TotalDays));
        }

        public async Task<Dictionary<string, int>> GetLeaveStatisticsByDepartmentAsync(string department, int year)
        {
            var startOfYear = DateTime.SpecifyKind(new DateTime(year, 1, 1), DateTimeKind.Utc);
            var endOfYear = DateTime.SpecifyKind(new DateTime(year, 12, 31), DateTimeKind.Utc);

            var leaveRequests = await _context.LeaveRequests
                .Include(lr => lr.Employee)
                .Where(lr => lr.Employee!.Department == department &&
                           lr.StartDate >= startOfYear &&
                           lr.EndDate <= endOfYear)
                .ToListAsync();

            return leaveRequests
                .GroupBy(lr => lr.Status)
                .ToDictionary(g => g.Key, g => g.Sum(lr => lr.TotalDays));
        }
    }
}
