using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_PESO_PIG.Models
{
    [Table("feeding")]
    public class Feeding
    {
        [Key]
        [Column("id_feeding")]
        public int id_Feeding { get; set; }

        [Required(ErrorMessage = "La observación es requerida")]
        [StringLength(500, ErrorMessage = "La observación no puede exceder 500 caracteres")]
        [Column("obc_feeding")]
        public string Obc_Feeding { get; set; }

        [Required(ErrorMessage = "La ración por animal es requerida")]
        [Range(0.01, 999.99, ErrorMessage = "La ración por animal debe estar entre 0.01 y 999.99 kg")]
        [Column("can_food", TypeName = "FLOAT")]
        public float Can_Food { get; set; } // Ración por animal en KG

        // Quitar la validación Range de Sum_Food porque se calcula automáticamente
        [Column("sum_food", TypeName = "FLOAT")]
        public float Sum_Food { get; set; } = 0; // Total de alimento = Can_Food * Número de animales

        [Required(ErrorMessage = "La fecha de alimentación es requerida")]
        [Column("dat_feeding")]
        public DateTime Dat_Feeding { get; set; }

        [Required(ErrorMessage = "El usuario es requerido")]
        [Column("id_users")]
        public int id_Users { get; set; }

        [Required(ErrorMessage = "El corral es requerido")]
        [Column("id_corral")]
        public int id_Corral { get; set; }

        [Required(ErrorMessage = "El alimento es requerido")]
        [Column("id_food")]
        public int id_Food { get; set; }

        // Propiedades de navegación
        [ForeignKey("id_Users")]
        public virtual User? user { get; set; }

        [ForeignKey("id_Corral")]
        public virtual Corral? Corral { get; set; }

        [ForeignKey("id_Food")]
        public virtual Food? food { get; set; }
    }
}
