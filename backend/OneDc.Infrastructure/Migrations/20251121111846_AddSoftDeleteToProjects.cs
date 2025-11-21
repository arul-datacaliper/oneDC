using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSoftDeleteToProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "deleted_at",
                schema: "ts",
                table: "project",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "deleted_by",
                schema: "ts",
                table: "project",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                schema: "ts",
                table: "project",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "ix_project_is_deleted",
                schema: "ts",
                table: "project",
                column: "is_deleted");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_project_is_deleted",
                schema: "ts",
                table: "project");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                schema: "ts",
                table: "project");

            migrationBuilder.DropColumn(
                name: "deleted_by",
                schema: "ts",
                table: "project");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                schema: "ts",
                table: "project");
        }
    }
}
