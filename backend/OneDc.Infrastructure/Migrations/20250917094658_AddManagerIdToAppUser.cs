using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManagerIdToAppUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "manager_id",
                schema: "ts",
                table: "app_user",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "manager_id",
                schema: "ts",
                table: "app_user");
        }
    }
}
