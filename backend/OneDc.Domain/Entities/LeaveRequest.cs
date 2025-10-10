using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OneDc.Domain.Entities
{
    public class LeaveRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey("EmployeeId")]
        public virtual AppUser? Employee { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [Required]
        [StringLength(50)]
        public string LeaveType { get; set; } = null!; // Annual, Sick, Personal, Emergency, etc.

        [StringLength(500)]
        public string? Reason { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        public Guid? ApproverId { get; set; }

        [ForeignKey("ApproverId")]
        public virtual AppUser? Approver { get; set; }

        public DateTime? ApprovedDate { get; set; }

        [StringLength(500)]
        public string? ApproverComments { get; set; }

        [Required]
        public DateTime CreatedDate { get; set; }

        public DateTime? ModifiedDate { get; set; }

        [Required]
        public int TotalDays { get; set; }

        public bool IsHalfDay { get; set; } = false;

        [StringLength(20)]
        public string? HalfDayPeriod { get; set; } // Morning, Afternoon (if IsHalfDay is true)

        // Calculated property for display
        [NotMapped]
        public string? EmployeeName => Employee != null ? $"{Employee.FirstName} {Employee.LastName}" : null;

        [NotMapped]
        public string? ApproverName => Approver != null ? $"{Approver.FirstName} {Approver.LastName}" : null;
    }
}
