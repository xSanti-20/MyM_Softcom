using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mym_softcom.Migrations
{
    /// <inheritdoc />
    public partial class AddRedistributionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastQuotaValue",
                table: "sales");

            migrationBuilder.DropColumn(
                name: "RedistributionAmount",
                table: "sales");

            migrationBuilder.RenameColumn(
                name: "HouseInitialPercentage",
                table: "sales",
                newName: "houseInitialPercentage");

            migrationBuilder.RenameColumn(
                name: "HouseInitialAmount",
                table: "sales",
                newName: "houseInitialAmount");

            migrationBuilder.RenameColumn(
                name: "CustomQuotasJson",
                table: "sales",
                newName: "customQuotasJson");

            migrationBuilder.AddColumn<int>(
                name: "FromQuotaRange",
                table: "sales",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ToQuotaRange",
                table: "sales",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FromQuotaRange",
                table: "sales");

            migrationBuilder.DropColumn(
                name: "ToQuotaRange",
                table: "sales");

            migrationBuilder.RenameColumn(
                name: "houseInitialPercentage",
                table: "sales",
                newName: "HouseInitialPercentage");

            migrationBuilder.RenameColumn(
                name: "houseInitialAmount",
                table: "sales",
                newName: "HouseInitialAmount");

            migrationBuilder.RenameColumn(
                name: "customQuotasJson",
                table: "sales",
                newName: "CustomQuotasJson");

            migrationBuilder.AddColumn<decimal>(
                name: "LastQuotaValue",
                table: "sales",
                type: "decimal(65,30)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RedistributionAmount",
                table: "sales",
                type: "decimal(65,30)",
                nullable: true);
        }
    }
}
