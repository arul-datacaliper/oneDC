using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordResetTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "password_reset",
                schema: "ts",
                columns: table => new
                {
                    reset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    otp = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    used_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    is_used = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_password_reset", x => x.reset_id);
                    table.ForeignKey(
                        name: "fk_password_reset_app_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_password_reset_expires_at",
                schema: "ts",
                table: "password_reset",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "ix_password_reset_otp_user_id",
                schema: "ts",
                table: "password_reset",
                columns: new[] { "otp", "user_id" });

            migrationBuilder.CreateIndex(
                name: "ix_password_reset_user_id",
                schema: "ts",
                table: "password_reset",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "password_reset",
                schema: "ts");
        }
    }
}
