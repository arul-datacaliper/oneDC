using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneDc.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFileBlob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "file_blob",
                schema: "ts",
                columns: table => new
                {
                    file_blob_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    original_file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_size = table.Column<long>(type: "bigint", nullable: false),
                    data = table.Column<byte[]>(type: "bytea", nullable: false),
                    container = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "default"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    last_accessed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_file_blob", x => x.file_blob_id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_file_blob_container_file_name",
                schema: "ts",
                table: "file_blob",
                columns: new[] { "container", "file_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_file_blob_created_at",
                schema: "ts",
                table: "file_blob",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_file_blob_last_accessed_at",
                schema: "ts",
                table: "file_blob",
                column: "last_accessed_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "file_blob",
                schema: "ts");
        }
    }
}
