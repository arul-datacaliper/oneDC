using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddNavigations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "allocation_pct",
                schema: "ts",
                table: "project_allocation",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<string>(
                name: "status",
                schema: "ts",
                table: "project",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ACTIVE",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<decimal>(
                name: "budget_hours",
                schema: "ts",
                table: "project",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "budget_cost",
                schema: "ts",
                table: "project",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "billable",
                schema: "ts",
                table: "project",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                schema: "ts",
                table: "holiday",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "IN",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "name",
                schema: "ts",
                table: "holiday",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "ix_project_allocation_user_id",
                schema: "ts",
                table: "project_allocation",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_client_code",
                schema: "ts",
                table: "client",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_app_user_email",
                schema: "ts",
                table: "app_user",
                column: "email",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_project_client_client_id",
                schema: "ts",
                table: "project",
                column: "client_id",
                principalSchema: "ts",
                principalTable: "client",
                principalColumn: "client_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_project_allocation_app_user_user_id",
                schema: "ts",
                table: "project_allocation",
                column: "user_id",
                principalSchema: "ts",
                principalTable: "app_user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_project_allocation_project_project_id",
                schema: "ts",
                table: "project_allocation",
                column: "project_id",
                principalSchema: "ts",
                principalTable: "project",
                principalColumn: "project_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_timesheet_entry_app_user_user_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "user_id",
                principalSchema: "ts",
                principalTable: "app_user",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_timesheet_entry_project_project_id",
                schema: "ts",
                table: "timesheet_entry",
                column: "project_id",
                principalSchema: "ts",
                principalTable: "project",
                principalColumn: "project_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_project_client_client_id",
                schema: "ts",
                table: "project");

            migrationBuilder.DropForeignKey(
                name: "fk_project_allocation_app_user_user_id",
                schema: "ts",
                table: "project_allocation");

            migrationBuilder.DropForeignKey(
                name: "fk_project_allocation_project_project_id",
                schema: "ts",
                table: "project_allocation");

            migrationBuilder.DropForeignKey(
                name: "fk_timesheet_entry_app_user_user_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.DropForeignKey(
                name: "fk_timesheet_entry_project_project_id",
                schema: "ts",
                table: "timesheet_entry");

            migrationBuilder.DropIndex(
                name: "ix_project_allocation_user_id",
                schema: "ts",
                table: "project_allocation");

            migrationBuilder.DropIndex(
                name: "ix_client_code",
                schema: "ts",
                table: "client");

            migrationBuilder.DropIndex(
                name: "ix_app_user_email",
                schema: "ts",
                table: "app_user");

            migrationBuilder.AlterColumn<decimal>(
                name: "allocation_pct",
                schema: "ts",
                table: "project_allocation",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(5,2)",
                oldPrecision: 5,
                oldScale: 2);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                schema: "ts",
                table: "project",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldDefaultValue: "ACTIVE");

            migrationBuilder.AlterColumn<decimal>(
                name: "budget_hours",
                schema: "ts",
                table: "project",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,2)",
                oldPrecision: 10,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "budget_cost",
                schema: "ts",
                table: "project",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldPrecision: 12,
                oldScale: 2,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "billable",
                schema: "ts",
                table: "project",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "region",
                schema: "ts",
                table: "holiday",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "IN");

            migrationBuilder.AlterColumn<string>(
                name: "name",
                schema: "ts",
                table: "holiday",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }
    }
}
