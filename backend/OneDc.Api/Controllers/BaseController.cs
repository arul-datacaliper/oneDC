using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace OneDc.Api.Controllers;

/// <summary>
/// Base controller providing common authentication and authorization functionality
/// for all API controllers in the application.
/// </summary>
public abstract class BaseController : ControllerBase
{
    /// <summary>
    /// Gets the current authenticated user's ID from the JWT token.
    /// </summary>
    /// <returns>The user's unique identifier</returns>
    /// <exception cref="UnauthorizedAccessException">Thrown when user ID cannot be determined</exception>
    protected Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                         ?? User.FindFirst("sub")?.Value 
                         ?? User.FindFirst("userId")?.Value;
        
        if (userIdClaim != null && Guid.TryParse(userIdClaim, out var userId))
            return userId;
            
        // Fallback to debug header for development
        if (Request.Headers.TryGetValue("X-Debug-UserId", out var raw) && Guid.TryParse(raw, out var debugId))
            return debugId;
            
        throw new UnauthorizedAccessException("Unable to determine user ID from token or debug header.");
    }

    /// <summary>
    /// Gets the current authenticated user's role from the JWT token.
    /// </summary>
    /// <returns>The user's role (ADMIN, APPROVER, EMPLOYEE)</returns>
    protected string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? "EMPLOYEE";
    }

    /// <summary>
    /// Checks if the current user has administrator or approver privileges.
    /// </summary>
    /// <returns>True if user is ADMIN or APPROVER, false otherwise</returns>
    protected bool IsAdminOrApprover()
    {
        var role = GetCurrentUserRole();
        return role == "ADMIN" || role == "APPROVER";
    }

    /// <summary>
    /// Checks if the current user has administrator privileges.
    /// </summary>
    /// <returns>True if user is ADMIN, false otherwise</returns>
    protected bool IsAdmin()
    {
        return GetCurrentUserRole() == "ADMIN";
    }

    /// <summary>
    /// Checks if the current user has approver privileges.
    /// </summary>
    /// <returns>True if user is APPROVER, false otherwise</returns>
    protected bool IsApprover()
    {
        return GetCurrentUserRole() == "APPROVER";
    }

    /// <summary>
    /// Checks if the current user has a specific role.
    /// </summary>
    /// <param name="role">The role to check for</param>
    /// <returns>True if user has the specified role, false otherwise</returns>
    protected bool HasRole(string role)
    {
        return GetCurrentUserRole().Equals(role, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Checks if the current user is the same as the specified user ID.
    /// Useful for ensuring users can only access their own data.
    /// </summary>
    /// <param name="userId">The user ID to check against</param>
    /// <returns>True if the current user matches the specified user ID</returns>
    protected bool IsCurrentUser(Guid userId)
    {
        try
        {
            return GetCurrentUserId() == userId;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
    }

    /// <summary>
    /// Checks if the current user can access data for the specified user.
    /// Admin/Approver users can access any user's data, regular employees can only access their own.
    /// </summary>
    /// <param name="targetUserId">The user ID to check access for</param>
    /// <returns>True if access is allowed, false otherwise</returns>
    protected bool CanAccessUserData(Guid targetUserId)
    {
        return IsAdminOrApprover() || IsCurrentUser(targetUserId);
    }
}
