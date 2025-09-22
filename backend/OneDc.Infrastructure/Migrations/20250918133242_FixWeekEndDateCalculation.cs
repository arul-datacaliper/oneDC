using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixWeekEndDateCalculation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update all existing WeeklyAllocation records to have correct WeekEndDate (Sunday + 6 = Saturday)
            migrationBuilder.Sql(@"
                UPDATE ts.weekly_allocation 
                SET week_end_date = week_start_date + INTERVAL '6 days'
                WHERE week_end_date IS NULL OR week_end_date != week_start_date + INTERVAL '6 days';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
