using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClientFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "city",
                schema: "ts",
                table: "client",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_number",
                schema: "ts",
                table: "client",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_person",
                schema: "ts",
                table: "client",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "country",
                schema: "ts",
                table: "client",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email",
                schema: "ts",
                table: "client",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "state",
                schema: "ts",
                table: "client",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "zip_code",
                schema: "ts",
                table: "client",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "city",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "contact_number",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "contact_person",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "country",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "email",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "state",
                schema: "ts",
                table: "client");

            migrationBuilder.DropColumn(
                name: "zip_code",
                schema: "ts",
                table: "client");
        }
    }
}
