using API_PESO_PIG.Models;
using Microsoft.EntityFrameworkCore;

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
    modelBuilder.Entity<Corral>().ToTable("corrals");
    modelBuilder.Entity<Feeding>().ToTable("feedings");
    modelBuilder.Entity<Food>().ToTable("foods");
    modelBuilder.Entity<Piglet>().ToTable("piglets");
    modelBuilder.Entity<Entries>().ToTable("entries");
    modelBuilder.Entity<Race>().ToTable("races");
    modelBuilder.Entity<Stage>().ToTable("stages");
    modelBuilder.Entity<Weighing>().ToTable("weighings");

    base.OnModelCreating(modelBuilder);
}

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Corral> Corrals { get; set; }
    public DbSet<Feeding> Feedings { get; set; }
    public DbSet<Food> Foods { get; set; }
    public DbSet<Piglet> Piglets { get; set; }
    public DbSet<Entries> Entries { get; set; }
    public DbSet<Race> Races { get; set; }
    public DbSet<Stage> Stages { get; set; }
    public DbSet<Weighing> Weighings { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            optionsBuilder.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 23)));
        }
    }
}
