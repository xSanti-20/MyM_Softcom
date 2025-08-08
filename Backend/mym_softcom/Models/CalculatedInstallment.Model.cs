namespace mym_softcom.Models
{
    public class CalculatedInstallment
    {
        public int QuotaNumber { get; set; }
        public decimal QuotaValue { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal Balance { get; set; }
        public DateTime DueDate { get; set; }
        public string Status { get; set; } // "Pagado", "Pendiente", "Mora", "Abonado"
        public int DaysOverdue { get; set; }
        public Sale Sale { get; set; }
        public Client Client { get; set; }
    }

    public class ClientOverdueInfo
    {
        public Client Client { get; set; }
        public List<CalculatedInstallment> OverdueInstallments { get; set; }
        public decimal TotalOverdueAmount { get; set; }
        public int TotalOverdueQuotas { get; set; }
        public DateTime? LastNotificationSent { get; set; }
    }
}
