import axios from "axios";
import { toast } from "react-toastify";
import Router from "next/router";

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.27:5000/',
  headers: {
    'accept': '*/*',
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Interceptor de respuestas
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    if (status === 403) {
      toast.error(message || "No tiene permisos para acceder.");
      // Puedes redirigir si quieres:
      // Router.push("/unauthorized"); // crea esta página si deseas
    }

    if (status === 401) {
      toast.error("No está autenticado.");
      // Router.push("/login");
    }

    // Siempre devuelve la promesa rechazada para que los catch() locales sigan funcionando
    return Promise.reject(error);
  }
);

export default axiosInstance;