using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveRequestTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "leave_request",
                schema: "ts",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    employee_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    leave_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    approver_id = table.Column<Guid>(type: "uuid", nullable: true),
                    approved_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approver_comments = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    modified_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    total_days = table.Column<int>(type: "integer", nullable: false),
                    is_half_day = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    half_day_period = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_leave_request", x => x.id);
                    table.ForeignKey(
                        name: "fk_leave_request_app_user_approver_id",
                        column: x => x.approver_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_leave_request_app_user_employee_id",
                        column: x => x.employee_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_leave_request_approver_id",
                schema: "ts",
                table: "leave_request",
                column: "approver_id");

            migrationBuilder.CreateIndex(
                name: "ix_leave_request_created_date",
                schema: "ts",
                table: "leave_request",
                column: "created_date");

            migrationBuilder.CreateIndex(
                name: "ix_leave_request_employee_id",
                schema: "ts",
                table: "leave_request",
                column: "employee_id");

            migrationBuilder.CreateIndex(
                name: "ix_leave_request_start_date_end_date",
                schema: "ts",
                table: "leave_request",
                columns: new[] { "start_date", "end_date" });

            migrationBuilder.CreateIndex(
                name: "ix_leave_request_status",
                schema: "ts",
                table: "leave_request",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "leave_request",
                schema: "ts");
        }
    }
}
