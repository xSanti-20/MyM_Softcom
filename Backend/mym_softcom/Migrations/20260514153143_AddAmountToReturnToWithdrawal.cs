using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace mym_softcom.Migrations
{
    /// <inheritdoc />
    public partial class AddAmountToReturnToWithdrawal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    id_Clients = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    names = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    surnames = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    document = table.Column<int>(type: "int", nullable: false),
                    phone = table.Column<long>(type: "bigint", nullable: true),
                    email = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.id_Clients);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "material_categories",
                columns: table => new
                {
                    id_Categories = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValue: "Activo")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_date = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_material_categories", x => x.id_Categories);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Materials",
                columns: table => new
                {
                    id_Materials = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    unit_of_measure = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    unit_cost = table.Column<decimal>(type: "decimal(15,2)", nullable: true),
                    current_stock = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    minimum_stock = table.Column<decimal>(type: "decimal(15,2)", nullable: true),
                    category = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_date = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materials", x => x.id_Materials);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Plans",
                columns: table => new
                {
                    id_Plans = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    number_quotas = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plans", x => x.id_Plans);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    id_Projects = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.id_Projects);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id_Users = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Nom_Users = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Tip_Users = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Blockade = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Token = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    Hashed_Password = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Salt = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ResetToken = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ResetTokenExpiration = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastActive = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id_Users);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Lots",
                columns: table => new
                {
                    id_Lots = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    block = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    lot_number = table.Column<int>(type: "int", nullable: false),
                    lot_area = table.Column<int>(type: "int", nullable: false),
                    Location = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    id_Projects = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lots", x => x.id_Lots);
                    table.ForeignKey(
                        name: "FK_Lots_Projects_id_Projects",
                        column: x => x.id_Projects,
                        principalTable: "Projects",
                        principalColumn: "id_Projects",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "material_movements",
                columns: table => new
                {
                    id_MaterialMovements = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    id_Materials = table.Column<int>(type: "int", nullable: false),
                    movement_type = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    old_stock = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    new_stock = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    difference = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    observations = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    supplier = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    id_Projects = table.Column<int>(type: "int", nullable: true),
                    user_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_date = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_material_movements", x => x.id_MaterialMovements);
                    table.ForeignKey(
                        name: "FK_material_movements_Materials_id_Materials",
                        column: x => x.id_Materials,
                        principalTable: "Materials",
                        principalColumn: "id_Materials",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_material_movements_Projects_id_Projects",
                        column: x => x.id_Projects,
                        principalTable: "Projects",
                        principalColumn: "id_Projects",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "sales",
                columns: table => new
                {
                    id_Sales = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    sale_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    total_value = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    initial_payment = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    initial_payment_method = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    total_raised = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    quota_value = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    total_debt = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    status = table.Column<string>(type: "enum('Active','Desistida','Escriturar')", nullable: true, defaultValue: "Active")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RedistributionAmount = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    RedistributionType = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RedistributedQuotaNumbers = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastQuotaValue = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    NewQuotaValue = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    OriginalQuotaValue = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    PaymentPlanType = table.Column<string>(type: "longtext", nullable: true, defaultValue: "Automatic")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CustomQuotasJson = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    HouseInitialPercentage = table.Column<decimal>(type: "decimal(65,30)", nullable: true, defaultValue: 30m),
                    HouseInitialAmount = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    id_Clients = table.Column<int>(type: "int", nullable: false),
                    id_Lots = table.Column<int>(type: "int", nullable: false),
                    id_Users = table.Column<int>(type: "int", nullable: false),
                    id_Plans = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales", x => x.id_Sales);
                    table.ForeignKey(
                        name: "FK_sales_Clients_id_Clients",
                        column: x => x.id_Clients,
                        principalTable: "Clients",
                        principalColumn: "id_Clients",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_Lots_id_Lots",
                        column: x => x.id_Lots,
                        principalTable: "Lots",
                        principalColumn: "id_Lots",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_Plans_id_Plans",
                        column: x => x.id_Plans,
                        principalTable: "Plans",
                        principalColumn: "id_Plans",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sales_users_id_Users",
                        column: x => x.id_Users,
                        principalTable: "users",
                        principalColumn: "id_Users",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Cesions",
                columns: table => new
                {
                    id_Cesiones = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    cesion_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    cesion_reason = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    cesion_cost = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    id_Client_Cedente = table.Column<int>(type: "int", nullable: false),
                    id_Client_Cesionario = table.Column<int>(type: "int", nullable: false),
                    id_Sales = table.Column<int>(type: "int", nullable: false),
                    id_Users = table.Column<int>(type: "int", nullable: false),
                    valor_pagado_antes_cesion = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    deuda_antes_cesion = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    observaciones = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cesions", x => x.id_Cesiones);
                    table.ForeignKey(
                        name: "FK_Cesions_Clients_id_Client_Cedente",
                        column: x => x.id_Client_Cedente,
                        principalTable: "Clients",
                        principalColumn: "id_Clients",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cesions_Clients_id_Client_Cesionario",
                        column: x => x.id_Client_Cesionario,
                        principalTable: "Clients",
                        principalColumn: "id_Clients",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cesions_sales_id_Sales",
                        column: x => x.id_Sales,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cesions_users_id_Users",
                        column: x => x.id_Users,
                        principalTable: "users",
                        principalColumn: "id_Users",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Discounts",
                columns: table => new
                {
                    id_Discount = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    id_Clients = table.Column<int>(type: "int", nullable: false),
                    id_Sales = table.Column<int>(type: "int", nullable: true),
                    discount_amount = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    discount_type = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    apply_to = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    notes = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    discount_date = table.Column<DateTime>(type: "date", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Discounts", x => x.id_Discount);
                    table.ForeignKey(
                        name: "FK_Discounts_Clients_id_Clients",
                        column: x => x.id_Clients,
                        principalTable: "Clients",
                        principalColumn: "id_Clients",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Discounts_sales_id_Sales",
                        column: x => x.id_Sales,
                        principalTable: "sales",
                        principalColumn: "id_Sales");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    id_Payments = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    payment_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    payment_method = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    id_Sales = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.id_Payments);
                    table.ForeignKey(
                        name: "FK_Payments_sales_id_Sales",
                        column: x => x.id_Sales,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "transfers",
                columns: table => new
                {
                    id_Transfers = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    transfer_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    type = table.Column<string>(type: "enum('Completo','Parcial')", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    amount_transferred = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    accounting_note = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    id_Sales_Origen = table.Column<int>(type: "int", nullable: false),
                    id_Sales_Destino = table.Column<int>(type: "int", nullable: false),
                    id_Clients = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfers", x => x.id_Transfers);
                    table.ForeignKey(
                        name: "FK_transfers_Clients_id_Clients",
                        column: x => x.id_Clients,
                        principalTable: "Clients",
                        principalColumn: "id_Clients",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transfers_sales_id_Sales_Destino",
                        column: x => x.id_Sales_Destino,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_transfers_sales_id_Sales_Origen",
                        column: x => x.id_Sales_Origen,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Withdrawals",
                columns: table => new
                {
                    id_Withdrawals = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    reason = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    withdrawal_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    penalty = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    amount_to_return = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    id_Sales = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Withdrawals", x => x.id_Withdrawals);
                    table.ForeignKey(
                        name: "FK_Withdrawals_sales_id_Sales",
                        column: x => x.id_Sales,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Details",
                columns: table => new
                {
                    id_Details = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    number_quota = table.Column<int>(type: "int", nullable: false),
                    covered_amount = table.Column<decimal>(type: "decimal(15,2)", nullable: true),
                    id_Payments = table.Column<int>(type: "int", nullable: false),
                    id_Sales = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Details", x => x.id_Details);
                    table.ForeignKey(
                        name: "FK_Details_Payments_id_Payments",
                        column: x => x.id_Payments,
                        principalTable: "Payments",
                        principalColumn: "id_Payments",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Details_sales_id_Sales",
                        column: x => x.id_Sales,
                        principalTable: "sales",
                        principalColumn: "id_Sales",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "transfer_details",
                columns: table => new
                {
                    id_TransferDetails = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    id_Transfers = table.Column<int>(type: "int", nullable: false),
                    number_quota = table.Column<int>(type: "int", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(15,2)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfer_details", x => x.id_TransferDetails);
                    table.ForeignKey(
                        name: "FK_transfer_details_transfers_id_Transfers",
                        column: x => x.id_Transfers,
                        principalTable: "transfers",
                        principalColumn: "id_Transfers",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Cesions_id_Client_Cedente",
                table: "Cesions",
                column: "id_Client_Cedente");

            migrationBuilder.CreateIndex(
                name: "IX_Cesions_id_Client_Cesionario",
                table: "Cesions",
                column: "id_Client_Cesionario");

            migrationBuilder.CreateIndex(
                name: "IX_Cesions_id_Sales",
                table: "Cesions",
                column: "id_Sales");

            migrationBuilder.CreateIndex(
                name: "IX_Cesions_id_Users",
                table: "Cesions",
                column: "id_Users");

            migrationBuilder.CreateIndex(
                name: "IX_Details_id_Payments",
                table: "Details",
                column: "id_Payments");

            migrationBuilder.CreateIndex(
                name: "IX_Details_id_Sales",
                table: "Details",
                column: "id_Sales");

            migrationBuilder.CreateIndex(
                name: "IX_Discounts_id_Clients",
                table: "Discounts",
                column: "id_Clients");

            migrationBuilder.CreateIndex(
                name: "IX_Discounts_id_Sales",
                table: "Discounts",
                column: "id_Sales");

            migrationBuilder.CreateIndex(
                name: "IX_Lots_id_Projects",
                table: "Lots",
                column: "id_Projects");

            migrationBuilder.CreateIndex(
                name: "IX_material_categories_name",
                table: "material_categories",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_material_movements_id_Materials",
                table: "material_movements",
                column: "id_Materials");

            migrationBuilder.CreateIndex(
                name: "IX_material_movements_id_Projects",
                table: "material_movements",
                column: "id_Projects");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_id_Sales",
                table: "Payments",
                column: "id_Sales");

            migrationBuilder.CreateIndex(
                name: "IX_sales_id_Clients",
                table: "sales",
                column: "id_Clients");

            migrationBuilder.CreateIndex(
                name: "IX_sales_id_Lots",
                table: "sales",
                column: "id_Lots");

            migrationBuilder.CreateIndex(
                name: "IX_sales_id_Plans",
                table: "sales",
                column: "id_Plans");

            migrationBuilder.CreateIndex(
                name: "IX_sales_id_Users",
                table: "sales",
                column: "id_Users");

            migrationBuilder.CreateIndex(
                name: "IX_transfer_details_id_Transfers",
                table: "transfer_details",
                column: "id_Transfers");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_id_Clients",
                table: "transfers",
                column: "id_Clients");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_id_Sales_Destino",
                table: "transfers",
                column: "id_Sales_Destino");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_id_Sales_Origen",
                table: "transfers",
                column: "id_Sales_Origen");

            migrationBuilder.CreateIndex(
                name: "IX_Withdrawals_id_Sales",
                table: "Withdrawals",
                column: "id_Sales");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cesions");

            migrationBuilder.DropTable(
                name: "Details");

            migrationBuilder.DropTable(
                name: "Discounts");

            migrationBuilder.DropTable(
                name: "material_categories");

            migrationBuilder.DropTable(
                name: "material_movements");

            migrationBuilder.DropTable(
                name: "transfer_details");

            migrationBuilder.DropTable(
                name: "Withdrawals");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "Materials");

            migrationBuilder.DropTable(
                name: "transfers");

            migrationBuilder.DropTable(
                name: "sales");

            migrationBuilder.DropTable(
                name: "Clients");

            migrationBuilder.DropTable(
                name: "Lots");

            migrationBuilder.DropTable(
                name: "Plans");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "Projects");
        }
    }
}
