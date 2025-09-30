using Microsoft.EntityFrameworkCore;
using mym_softcom.Models;
using System.Numerics;

public class AppDbContext : DbContext
{
    private readonly IConfiguration _configuration;

    public AppDbContext(DbContextOptions<AppDbContext> options, IConfiguration configuration) : base(options)
    {
        _configuration = configuration;
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().ToTable("users");

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.ToTable("sales");
            
            // CONFIGURACIÓN MEJORADA: Especificar explícitamente el tipo y valor por defecto
            entity.Property(e => e.status)
                .HasColumnType("enum('Active','Desistida','Escriturar')")
                .HasDefaultValue("Active")
                .IsRequired(false); // Permitir null temporalmente para manejar el valor por defecto
                
            // CONFIGURACIÓN ADICIONAL: Asegurar que otras propiedades tengan la configuración correcta
            entity.Property(e => e.PaymentPlanType)
                .HasDefaultValue("Automatic");
                
            entity.Property(e => e.HouseInitialPercentage)
                .HasDefaultValue(30m);
        });

        base.OnModelCreating(modelBuilder);
    }

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Client> Clients { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<Lot> Lots { get; set; }
    public DbSet<Plan> Plans { get; set; }
    public DbSet<Sale> Sales { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<Withdrawal> Withdrawals { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Detail> Details { get; set; }
    public DbSet<Cesion> Cesions { get; set; }


    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 23)));
        }
    }
}
