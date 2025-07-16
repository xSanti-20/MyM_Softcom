import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteRecord({ id, onDelete, refreshData }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const closeModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setShowConfirm(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(id);
      setSuccessMessage("Registro eliminado con éxito.");

      // 🔥 Verificamos si refreshData es una función antes de llamarla
      if (typeof refreshData === "function") {
        refreshData();  // ✅ Refresca la tabla después de eliminar
      } else {
        console.warn("⚠ refreshData no está definido o no es una función.");
      }
    } catch (error) {
      console.error("Error al eliminar el registro:", error);
      setErrorMessage("Error al eliminar el registro.");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-center mb-4 text-yellow-600">
              Confirmación
            </h2>
            <p className="text-center mb-6">
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleDelete}
                className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Eliminar
              </button>
              <button
                onClick={closeModal}
                className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de error */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-center mb-4 text-red-600">
              Error
            </h2>
            <p className="text-center mb-6">{errorMessage}</p>
            <button
              onClick={closeModal}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Alerta de éxito */}
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-center mb-4 text-green-600">
              Éxito
            </h2>
            <p className="text-center mb-6">{successMessage}</p>
            <button
              onClick={closeModal}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-800"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        {isDeleting ? "Eliminando..." : "Eliminar"}
      </Button>
    </>
  );
}

export default DeleteRecord;
