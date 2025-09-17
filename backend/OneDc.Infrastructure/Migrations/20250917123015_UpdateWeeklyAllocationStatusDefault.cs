using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateWeeklyAllocationStatusDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "status",
                schema: "ts",
                table: "weekly_allocation",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "Active");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "status",
                schema: "ts",
                table: "weekly_allocation",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Active",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "ACTIVE");
        }
    }
}
