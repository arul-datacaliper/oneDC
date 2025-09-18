using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.AddForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "task_id",
                principalSchema: "ts",
                principalTable: "task",
                principalColumn: "task_id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.AddForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "task_id",
                principalSchema: "ts",
                principalTable: "task",
                principalColumn: "task_id");
        }
    }
}
