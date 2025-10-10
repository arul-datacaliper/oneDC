using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OneDc.Services.Interfaces;
using System.Security.Claims;

namespace OneDc.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LeavesController : ControllerBase
    {
        private readonly ILeaveService _leaveService;
        private readonly ILogger<LeavesController> _logger;

        public LeavesController(ILeaveService leaveService, ILogger<LeavesController> logger)
        {
            _leaveService = leaveService;
            _logger = logger;
        }

        private Guid GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }

        private bool IsAdmin()
        {
            return User.HasClaim(ClaimTypes.Role, "ADMIN");
        }

        private bool IsApprover()
        {
            return User.HasClaim(ClaimTypes.Role, "APPROVER") || IsAdmin();
        }

        #region Employee Operations

        /// <summary>
        /// Create a new leave request
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<object>> CreateLeaveRequest([FromBody] LeaveRequestCreateDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                dto.EmployeeId = currentUserId; // Ensure employee can only create for themselves

                var leaveRequest = await _leaveService.CreateLeaveRequestAsync(dto);
                
                return Ok(new
                {
                    success = true,
                    message = "Leave request created successfully",
                    data = new
                    {
                        id = leaveRequest.Id,
                        employeeId = leaveRequest.EmployeeId,
                        startDate = leaveRequest.StartDate,
                        endDate = leaveRequest.EndDate,
                        leaveType = leaveRequest.LeaveType,
                        reason = leaveRequest.Reason,
                        status = leaveRequest.Status,
                        totalDays = leaveRequest.TotalDays,
                        isHalfDay = leaveRequest.IsHalfDay,
                        halfDayPeriod = leaveRequest.HalfDayPeriod,
                        createdDate = leaveRequest.CreatedDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating leave request");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get my leave requests
        /// </summary>
        [HttpGet("my-requests")]
        public async Task<ActionResult<object>> GetMyLeaveRequests()
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var leaveRequests = await _leaveService.GetMyLeaveRequestsAsync(currentUserId);

                var result = leaveRequests.Select(lr => new
                {
                    id = lr.Id,
                    startDate = lr.StartDate,
                    endDate = lr.EndDate,
                    leaveType = lr.LeaveType,
                    reason = lr.Reason,
                    status = lr.Status,
                    totalDays = lr.TotalDays,
                    isHalfDay = lr.IsHalfDay,
                    halfDayPeriod = lr.HalfDayPeriod,
                    approverName = lr.ApproverName,
                    approverComments = lr.ApproverComments,
                    approvedDate = lr.ApprovedDate,
                    createdDate = lr.CreatedDate,
                    modifiedDate = lr.ModifiedDate
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my leave requests");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Update a leave request (only if pending and own request)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateLeaveRequest(int id, [FromBody] LeaveRequestUpdateDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                dto.Id = id;

                var leaveRequest = await _leaveService.UpdateLeaveRequestAsync(dto, currentUserId);
                
                return Ok(new
                {
                    success = true,
                    message = "Leave request updated successfully",
                    data = new
                    {
                        id = leaveRequest.Id,
                        startDate = leaveRequest.StartDate,
                        endDate = leaveRequest.EndDate,
                        leaveType = leaveRequest.LeaveType,
                        reason = leaveRequest.Reason,
                        status = leaveRequest.Status,
                        totalDays = leaveRequest.TotalDays,
                        isHalfDay = leaveRequest.IsHalfDay,
                        halfDayPeriod = leaveRequest.HalfDayPeriod,
                        modifiedDate = leaveRequest.ModifiedDate
                    }
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating leave request {LeaveRequestId}", id);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Delete a leave request (only if pending and own request)
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteLeaveRequest(int id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var result = await _leaveService.DeleteLeaveRequestAsync(id, currentUserId);
                
                if (!result)
                {
                    return NotFound(new { success = false, message = "Leave request not found" });
                }

                return Ok(new { success = true, message = "Leave request deleted successfully" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting leave request {LeaveRequestId}", id);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get leave statistics for current user
        /// </summary>
        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetLeaveStatistics([FromQuery] int year = 0)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentYear = year > 0 ? year : DateTime.Now.Year;
                
                var statistics = await _leaveService.GetLeaveStatisticsAsync(currentUserId, currentYear);
                
                return Ok(new { success = true, data = statistics });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave statistics");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        #endregion

        #region Approver Operations

        /// <summary>
        /// Get pending leave requests for approval (Approver/Admin only)
        /// </summary>
        [HttpGet("pending")]
        [Authorize(Roles = "APPROVER,ADMIN")]
        public async Task<ActionResult<object>> GetPendingLeaveRequests()
        {
            try
            {
                var leaveRequests = await _leaveService.GetPendingLeaveRequestsAsync();

                var result = leaveRequests.Select(lr => new
                {
                    id = lr.Id,
                    employeeId = lr.EmployeeId,
                    employeeName = lr.EmployeeName,
                    startDate = lr.StartDate,
                    endDate = lr.EndDate,
                    leaveType = lr.LeaveType,
                    reason = lr.Reason,
                    status = lr.Status,
                    totalDays = lr.TotalDays,
                    isHalfDay = lr.IsHalfDay,
                    halfDayPeriod = lr.HalfDayPeriod,
                    createdDate = lr.CreatedDate
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending leave requests");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Approve or reject a leave request (Approver/Admin only)
        /// </summary>
        [HttpPost("{id}/approval")]
        [Authorize(Roles = "APPROVER,ADMIN")]
        public async Task<ActionResult<object>> ApproveOrRejectLeave(int id, [FromBody] LeaveApprovalDto dto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                dto.Id = id;
                dto.ApproverId = currentUserId;

                var leaveRequest = await _leaveService.ApproveOrRejectLeaveAsync(dto);
                
                return Ok(new
                {
                    success = true,
                    message = $"Leave request {dto.Status.ToLower()} successfully",
                    data = new
                    {
                        id = leaveRequest.Id,
                        status = leaveRequest.Status,
                        approverName = leaveRequest.ApproverName,
                        approverComments = leaveRequest.ApproverComments,
                        approvedDate = leaveRequest.ApprovedDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving/rejecting leave request {LeaveRequestId}", id);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get leave requests that I have approved/rejected (Approver/Admin only)
        /// </summary>
        [HttpGet("my-approvals")]
        [Authorize(Roles = "APPROVER,ADMIN")]
        public async Task<ActionResult<object>> GetMyApprovals()
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var leaveRequests = await _leaveService.GetLeaveRequestsByApproverAsync(currentUserId);

                var result = leaveRequests.Select(lr => new
                {
                    id = lr.Id,
                    employeeId = lr.EmployeeId,
                    employeeName = lr.EmployeeName,
                    startDate = lr.StartDate,
                    endDate = lr.EndDate,
                    leaveType = lr.LeaveType,
                    reason = lr.Reason,
                    status = lr.Status,
                    totalDays = lr.TotalDays,
                    isHalfDay = lr.IsHalfDay,
                    halfDayPeriod = lr.HalfDayPeriod,
                    approverComments = lr.ApproverComments,
                    approvedDate = lr.ApprovedDate,
                    createdDate = lr.CreatedDate
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my approved leave requests");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        #endregion

        #region Admin Operations

        /// <summary>
        /// Get all leave requests (Admin only)
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetAllLeaveRequests()
        {
            try
            {
                var leaveRequests = await _leaveService.GetAllLeaveRequestsAsync();

                var result = leaveRequests.Select(lr => new
                {
                    id = lr.Id,
                    employeeId = lr.EmployeeId,
                    employeeName = lr.EmployeeName,
                    startDate = lr.StartDate,
                    endDate = lr.EndDate,
                    leaveType = lr.LeaveType,
                    reason = lr.Reason,
                    status = lr.Status,
                    totalDays = lr.TotalDays,
                    isHalfDay = lr.IsHalfDay,
                    halfDayPeriod = lr.HalfDayPeriod,
                    approverName = lr.ApproverName,
                    approverComments = lr.ApproverComments,
                    approvedDate = lr.ApprovedDate,
                    createdDate = lr.CreatedDate,
                    modifiedDate = lr.ModifiedDate
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all leave requests");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get leave requests by employee (Admin only)
        /// </summary>
        [HttpGet("employee/{employeeId}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<object>> GetLeaveRequestsByEmployee(Guid employeeId)
        {
            try
            {
                var leaveRequests = await _leaveService.GetLeaveRequestsByEmployeeAsync(employeeId);

                var result = leaveRequests.Select(lr => new
                {
                    id = lr.Id,
                    startDate = lr.StartDate,
                    endDate = lr.EndDate,
                    leaveType = lr.LeaveType,
                    reason = lr.Reason,
                    status = lr.Status,
                    totalDays = lr.TotalDays,
                    isHalfDay = lr.IsHalfDay,
                    halfDayPeriod = lr.HalfDayPeriod,
                    approverName = lr.ApproverName,
                    approverComments = lr.ApproverComments,
                    approvedDate = lr.ApprovedDate,
                    createdDate = lr.CreatedDate,
                    modifiedDate = lr.ModifiedDate
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave requests for employee {EmployeeId}", employeeId);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        #endregion

        #region Utility Operations

        /// <summary>
        /// Get available leave types
        /// </summary>
        [HttpGet("types")]
        public async Task<ActionResult<object>> GetLeaveTypes()
        {
            try
            {
                var leaveTypes = await _leaveService.GetLeaveTypesAsync();
                return Ok(new { success = true, data = leaveTypes });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting leave types");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get remaining leave days for current user
        /// </summary>
        [HttpGet("remaining-days")]
        public async Task<ActionResult<object>> GetRemainingLeaveDays([FromQuery] int year = 0)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentYear = year > 0 ? year : DateTime.Now.Year;
                
                var remainingDays = await _leaveService.GetRemainingLeaveDaysAsync(currentUserId, currentYear);
                
                return Ok(new { success = true, data = new { remainingDays, year = currentYear } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting remaining leave days");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        /// <summary>
        /// Get upcoming leaves (Approver/Admin only)
        /// </summary>
        [HttpGet("upcoming")]
        [Authorize(Roles = "APPROVER,ADMIN")]
        public async Task<ActionResult<object>> GetUpcomingLeaves([FromQuery] int days = 30)
        {
            try
            {
                var upcomingLeaves = await _leaveService.GetUpcomingLeavesAsync(days);

                var result = upcomingLeaves
                    .Where(lr => lr.Status == "Approved")
                    .Select(lr => new
                    {
                        id = lr.Id,
                        employeeName = lr.EmployeeName,
                        startDate = lr.StartDate,
                        endDate = lr.EndDate,
                        leaveType = lr.LeaveType,
                        totalDays = lr.TotalDays,
                        isHalfDay = lr.IsHalfDay
                    });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming leaves");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        #endregion
    }
}
