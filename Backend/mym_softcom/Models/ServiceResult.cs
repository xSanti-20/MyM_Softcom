using System;

// ⚠️ NOTA: ServiceResult<T> ya está definido en Sale.Model.cs dentro de mym_softcom.Models
// Este archivo se mantiene como referencia pero NO se utiliza.
// El namespace se cambió para evitar duplicados.

namespace mym_softcom.Models.Helpers
{
    /// <summary>
    /// ⚠️ DEPRECATED - Esta clase está en Sale.Model.cs
    /// </summary>
    [Obsolete("Use mym_softcom.Models.ServiceResult<T> instead")]
    public class ServiceResultHelper<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
    }
}
