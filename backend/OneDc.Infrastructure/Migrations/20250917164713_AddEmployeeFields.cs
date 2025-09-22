using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "contact_number",
                schema: "ts",
                table: "app_user",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "date_of_birth",
                schema: "ts",
                table: "app_user",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "date_of_joining",
                schema: "ts",
                table: "app_user",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "department",
                schema: "ts",
                table: "app_user",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "emergency_contact_number",
                schema: "ts",
                table: "app_user",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "employee_id",
                schema: "ts",
                table: "app_user",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "employee_type",
                schema: "ts",
                table: "app_user",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "gender",
                schema: "ts",
                table: "app_user",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "job_title",
                schema: "ts",
                table: "app_user",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_address_line1",
                schema: "ts",
                table: "app_user",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_address_line2",
                schema: "ts",
                table: "app_user",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_city",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_country",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_state",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "permanent_zip_code",
                schema: "ts",
                table: "app_user",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "personal_email",
                schema: "ts",
                table: "app_user",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_address_line1",
                schema: "ts",
                table: "app_user",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_address_line2",
                schema: "ts",
                table: "app_user",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_city",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_country",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_state",
                schema: "ts",
                table: "app_user",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "present_zip_code",
                schema: "ts",
                table: "app_user",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "work_email",
                schema: "ts",
                table: "app_user",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "contact_number",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "date_of_birth",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "date_of_joining",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "department",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "emergency_contact_number",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "employee_id",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "employee_type",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "gender",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "job_title",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_address_line1",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_address_line2",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_city",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_country",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_state",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "permanent_zip_code",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "personal_email",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_address_line1",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_address_line2",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_city",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_country",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_state",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "present_zip_code",
                schema: "ts",
                table: "app_user");

            migrationBuilder.DropColumn(
                name: "work_email",
                schema: "ts",
                table: "app_user");
        }
    }
}
