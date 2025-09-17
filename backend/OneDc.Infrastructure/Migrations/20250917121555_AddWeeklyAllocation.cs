using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWeeklyAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "weekly_allocation",
                schema: "ts",
                columns: table => new
                {
                    allocation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    week_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    week_end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    allocated_hours = table.Column<int>(type: "integer", nullable: false),
                    utilization_percentage = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_weekly_allocation", x => x.allocation_id);
                    table.ForeignKey(
                        name: "fk_weekly_allocation_app_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_weekly_allocation_project_project_id",
                        column: x => x.project_id,
                        principalSchema: "ts",
                        principalTable: "project",
                        principalColumn: "project_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_weekly_allocation_project_id",
                schema: "ts",
                table: "weekly_allocation",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_weekly_allocation_project_id_user_id_week_start_date",
                schema: "ts",
                table: "weekly_allocation",
                columns: new[] { "project_id", "user_id", "week_start_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_weekly_allocation_user_id",
                schema: "ts",
                table: "weekly_allocation",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_weekly_allocation_week_start_date",
                schema: "ts",
                table: "weekly_allocation",
                column: "week_start_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "weekly_allocation",
                schema: "ts");
        }
    }
}
