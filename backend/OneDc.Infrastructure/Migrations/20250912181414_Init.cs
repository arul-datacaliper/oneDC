using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "ts");

            migrationBuilder.CreateTable(
                name: "app_user",
                schema: "ts",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    first_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    last_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_user", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "audit_log",
                schema: "ts",
                columns: table => new
                {
                    audit_log_id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_id = table.Column<Guid>(type: "uuid", nullable: true),
                    entity = table.Column<string>(type: "text", nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "text", nullable: false),
                    before_json = table.Column<string>(type: "text", nullable: true),
                    after_json = table.Column<string>(type: "text", nullable: true),
                    at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_log", x => x.audit_log_id);
                });

            migrationBuilder.CreateTable(
                name: "client",
                schema: "ts",
                columns: table => new
                {
                    client_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_client", x => x.client_id);
                });

            migrationBuilder.CreateTable(
                name: "holiday",
                schema: "ts",
                columns: table => new
                {
                    holiday_date = table.Column<DateOnly>(type: "date", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    region = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_holiday", x => x.holiday_date);
                });

            migrationBuilder.CreateTable(
                name: "project",
                schema: "ts",
                columns: table => new
                {
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    client_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    billable = table.Column<bool>(type: "boolean", nullable: false),
                    default_approver = table.Column<Guid>(type: "uuid", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    budget_hours = table.Column<decimal>(type: "numeric", nullable: true),
                    budget_cost = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project", x => x.project_id);
                });

            migrationBuilder.CreateTable(
                name: "project_allocation",
                schema: "ts",
                columns: table => new
                {
                    allocation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    allocation_pct = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_allocation", x => x.allocation_id);
                });

            migrationBuilder.CreateTable(
                name: "timesheet_entry",
                schema: "ts",
                columns: table => new
                {
                    entry_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    work_date = table.Column<DateOnly>(type: "date", nullable: false),
                    hours = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    ticket_ref = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    approved_by = table.Column<Guid>(type: "uuid", nullable: true),
                    approver_comment = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_timesheet_entry", x => x.entry_id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_audit_log_entity_entity_id_at",
                schema: "ts",
                table: "audit_log",
                columns: new[] { "entity", "entity_id", "at" });

            migrationBuilder.CreateIndex(
                name: "ix_project_client_id_status",
                schema: "ts",
                table: "project",
                columns: new[] { "client_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_project_code",
                schema: "ts",
                table: "project",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_project_allocation_project_id_user_id_start_date",
                schema: "ts",
                table: "project_allocation",
                columns: new[] { "project_id", "user_id", "start_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_timesheet_entry_project_id_work_date",
                schema: "ts",
                table: "timesheet_entry",
                columns: new[] { "project_id", "work_date" });

            migrationBuilder.CreateIndex(
                name: "ix_timesheet_entry_user_id_work_date",
                schema: "ts",
                table: "timesheet_entry",
                columns: new[] { "user_id", "work_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_user",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "audit_log",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "client",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "holiday",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "project",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "project_allocation",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "timesheet_entry",
                schema: "ts");
        }
    }
}
