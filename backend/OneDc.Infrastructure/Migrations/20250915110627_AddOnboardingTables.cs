using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_profile",
                schema: "ts",
                columns: table => new
                {
                    user_profile_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    profile_photo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    bio = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    department = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    job_title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    location = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    date_of_joining = table.Column<DateOnly>(type: "date", nullable: true),
                    employee_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    reporting_manager = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    total_experience_years = table.Column<int>(type: "integer", nullable: true),
                    education_background = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    certifications = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    linked_in_profile = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    git_hub_profile = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_onboarding_complete = table.Column<bool>(type: "boolean", nullable: false),
                    onboarding_completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_profile", x => x.user_profile_id);
                    table.ForeignKey(
                        name: "fk_user_profile_app_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_skill",
                schema: "ts",
                columns: table => new
                {
                    user_skill_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    skill_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    years_of_experience = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_skill", x => x.user_skill_id);
                    table.ForeignKey(
                        name: "fk_user_skill_app_user_user_id",
                        column: x => x.user_id,
                        principalSchema: "ts",
                        principalTable: "app_user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_user_profile_user_id",
                schema: "ts",
                table: "user_profile",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_user_skill_user_id_skill_name",
                schema: "ts",
                table: "user_skill",
                columns: new[] { "user_id", "skill_name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_profile",
                schema: "ts");

            migrationBuilder.DropTable(
                name: "user_skill",
                schema: "ts");
        }
    }
}
