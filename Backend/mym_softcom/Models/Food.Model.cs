using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_PESO_PIG.Models
{
    [Table("foods")]
    public class Food
    {
        [Key]
        [Column("id_food")]
        public int id_Food { get; set; }

        [Required(ErrorMessage = "El nombre del alimento es requerido")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
        [Column("nam_food")]
        public string Nam_Food { get; set; }

        [Required(ErrorMessage = "La unidad de medida es requerida")]
        [StringLength(10, ErrorMessage = "La unidad no puede exceder 10 caracteres")]
        [Column("und_extent")]
        public string Und_Extent { get; set; } = "KG";

        [Required(ErrorMessage = "El valor unitario es requerido")]
        [Range(0.01, 999999.99, ErrorMessage = "El valor unitario debe estar entre 0.01 y 999999.99")]
        [Column("vlr_unit")]
        public int Vlr_Unit { get; set; }

        [Required(ErrorMessage = "La etapa es requerida")]
        [Column("id_stage")]
        public int id_Stage { get; set; }

        [Required(ErrorMessage = "La ración del alimento es requerida")]
        [Range(0.01, 999.99, ErrorMessage = "La ración debe estar entre 0.01 y 999.99")]
        [Column("rat_food")]
        public int Rat_Food { get; set; }

        [Required(ErrorMessage = "La existencia es requerida")]
        [Range(0, 999999.99, ErrorMessage = "La existencia debe estar entre 0 y 999999.99")]
        [Column("existence", TypeName = "FLOAT")]
        public float Existence { get; set; } // Cambiado de int a float

        // Propiedad de navegación
        [ForeignKey("id_Stage")]
        public virtual Stage? stage { get; set; }
    }
}
