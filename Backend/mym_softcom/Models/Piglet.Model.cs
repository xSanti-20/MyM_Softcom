using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_PESO_PIG.Models
{
    public class Piglet
    {
        [Key]
        public int Id_Piglet { get; set; }

        [DisplayName("Nombre Lechon")]
        public string Name_Piglet { get; set; }

        [DisplayName("Peso Acumulado")]
        public float Acum_Weight { get; set; }

        [DisplayName("Fecha de Nacimiento")]
        public DateTime Fec_Birth { get; set; }

        [DisplayName("Peso Inicial")]
        public float Weight_Initial { get; set; }

        [DisplayName("Sexo Lechon")]
        public string Sex_Piglet { get; set; }

        [DisplayName("Placa Sena")]
        public int Placa_Sena { get; set; }

        [DisplayName("Estado")]
        public bool Is_Active { get; set; } = true; // Nuevo campo

        //foránea a la tabla Races
        public int Id_Race { get; set; }

        [ForeignKey("Id_Race")]
        public Race? race { get; set; }

        //foránea a la tabla Stages
        public int Id_Stage { get; set; }

        [ForeignKey("Id_Stage")]
        public Stage? stage { get; set; }

        //foránea a la tabla Corrals
        public int Id_Corral { get; set; }

        [ForeignKey("Id_Corral")]
        public Corral? corral { get; set; }

        [DisplayName("Fecha inico de etapa")]
        public DateTime? Sta_Date { get; set; }
    }

    // ========== CLASES AUXILIARES ==========

    public class StageInfo
    {
        public string Name { get; set; }
        public float WeightMin { get; set; }
        public float WeightMax { get; set; }
        public int MaxDays { get; set; }
        public string NextStage { get; set; }
    }

    public class StageTransitionResult
    {
        public int PigletId { get; set; }
        public string PigletName { get; set; }
        public string CurrentStage { get; set; }
        public string NewStage { get; set; }
        public float CurrentWeight { get; set; }
        public int DaysInStage { get; set; }
        public bool StageChanged { get; set; }
        public string TransitionReason { get; set; }
        public bool IsWeightDeficient { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
    }
}