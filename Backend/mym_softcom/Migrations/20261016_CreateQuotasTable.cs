using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace mym_softcom.Migrations
{
    /// <inheritdoc />
    public partial class CreateQuotasTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "quotas",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    id_sale = table.Column<int>(type: "int", nullable: false),
                    quota_number = table.Column<int>(type: "int", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    current_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    due_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    status = table.Column<string>(type: "varchar(50)", nullable: false, defaultValue: "Pending"),
                    redistributed_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP(6)"),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    last_modified = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quotas", x => x.id);
                    table.ForeignKey(
                        name: "FK_quotas_sales_id_sale",
                        column: x => x.id_sale,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_quota_sale",
                table: "quotas",
                column: "id_sale");

            migrationBuilder.CreateIndex(
                name: "idx_quota_number",
                table: "quotas",
                columns: new[] { "id_sale", "quota_number" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quotas");
        }
    }
}
