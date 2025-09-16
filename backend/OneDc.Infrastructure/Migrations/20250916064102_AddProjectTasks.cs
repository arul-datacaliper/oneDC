using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "task_id",
                schema: "ts",
                table: "timesheet_entry",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "task",
                schema: "ts",
                columns: table => new
                {
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    estimated_hours = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_task", x => x.task_id);
                    table.ForeignKey(
                        name: "fk_task_app_user_assigned_user_id",
                        column: x => x.assigned_user_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_task_project_project_id",
                        column: x => x.project_id,
                        principalSchema: "ts",
                        principalTable: "project",
                        principalColumn: "project_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_timesheet_entry_task_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "task_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_assigned_user_id",
                schema: "ts",
                table: "task",
                column: "assigned_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_project_id",
                schema: "ts",
                table: "task",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_task_project_id_status",
                schema: "ts",
                table: "task",
                columns: new[] { "project_id", "status" });

            migrationBuilder.AddForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "task_id",
                principalSchema: "ts",
                principalTable: "task",
                principalColumn: "task_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_timesheet_entry_task_task_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.DropTable(
                name: "task",
                schema: "ts");

            migrationBuilder.DropIndex(
                name: "ix_timesheet_entry_task_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.DropColumn(
                name: "task_id",
                schema: "ts",
                table: "timesheet_entry");
        }
    }
}
