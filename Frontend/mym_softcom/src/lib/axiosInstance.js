import axios from "axios";
import { toast } from "react-toastify";
import Router from "next/router";

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const resolveApiBaseUrl = () => {
  const configuredUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  const configuredPort = process.env.NEXT_PUBLIC_API_PORT || "5000";

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:${configuredPort}/`;
  }

  return `http://localhost:${configuredPort}/`;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
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