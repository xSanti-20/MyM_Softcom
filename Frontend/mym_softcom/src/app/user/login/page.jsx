"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import PublicNav from "@/components/nav/PublicNav";
import axiosInstance from "@/lib/axiosInstance";
import styles from "./Page.Module.css";

import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastViewport,
} from "@/components/ui/toast";

async function Login(credentials) {
  try {
    const response = await axiosInstance.post("/api/User/Login", credentials);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || "Error al iniciar sesión.");
    } else {
      throw new Error("No se pudo conectar con el servidor.");
    }
  }
}

function LoginPage() {
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [hasPasswordValue, setHasPasswordValue] = useState(false);

  function showToast(title, description, type) {
    setToast({ title, description, type });
    setTimeout(() => setToast(null), 3000);
  }

  const handlePasswordChange = (e) => {
    setHasPasswordValue(e.target.value.length > 0);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  async function handlerSubmit(event) {
    event.preventDefault();
    const formlogin = new FormData(event.currentTarget);
    const email = formlogin.get("email");
    const password = formlogin.get("Hashed_Password");

    const credentials = { email, password };

    try {
      const data = await Login(credentials);
      showToast("Inicio de sesión exitoso", "Redirigiendo al dashboard...", "success");

      localStorage.setItem("username", data.username);
      localStorage.setItem("email", data.email);
      localStorage.setItem("role", data.role);

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  }

  return (
    <ToastProvider>
      <PublicNav />
      <div className="wrapper">
        {toast && (
          <Toast
            className={`flex items-center gap-4 p-3 ${
              toast.type === "error" ? "bg-red-500 text-black" : "bg-green-500 text-black"
            }`}
          >
            <img src="/assets/img/mymsoftcom.png" alt="m&msoftcom" className="w-8 h-8" />
            <div className="flex flex-col items-center text-center w-full">
              <ToastTitle className="text-sm font-semibold">{toast.title}</ToastTitle>
              <ToastDescription className="text-xs">{toast.description}</ToastDescription>
            </div>
          </Toast>
        )}

        <div className="form_box">
          <form onSubmit={handlerSubmit}>
            <img src="/assets/img/mymsoftcom.png" alt="M&M" width="65" height="60" />
            <h1 className="title">Iniciar Sesión</h1>

            {/* Campo correo */}
            <div className="input_box relative">
              <input type="email" id="email" name="email" placeholder="Correo" required />
              <FaUser className="icon absolute right-3 top-1/2 transform -translate-y-1/2" />
            </div>

            {/* Campo contraseña con lógica de visibilidad */}
            <div className="input_box relative">
              <input
                type={showPassword ? "text" : "password"}
                id="Hashed_Password"
                name="Hashed_Password"
                placeholder="Contraseña"
                required
                onChange={handlePasswordChange}
                className="pr-10"
              />
              {hasPasswordValue ? (
                <span
                  onClick={togglePasswordVisibility}
                  className="icon absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              ) : (
                <FaLock className="icon absolute right-3 top-1/2 transform -translate-y-1/2" />
              )}
            </div>

            <button type="submit">Ingresar</button>

            <div className="remember_forgot">
              <a href="/user/password">¿Olvidó su Contraseña?</a>
            </div>

            <div className="register_link">
              <p>
                ¿No tiene una Cuenta? <a href="/user/register">Regístrese</a>
              </p>
            </div>
          </form>
        </div>
      </div>

      <ToastViewport />
    </ToastProvider>
  );
}

export default LoginPage;
