"use client"
import { useState } from "react"
import styles from "./page.module.css"
import axiosInstance from "@/lib/axiosInstance"
import PublicNav from "@/components/nav/PublicNav"
import { FaUser, FaLock, FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa"
import AlertModal from "@/components/AlertModal"

async function SendData(body) {
    const response = await axiosInstance.post("api/User/CreateUser", body)
    return response
}

function RegisterPage() {
    const [alertInfo, setAlertInfo] = useState({
        isOpen: false,
        message: "",
        type: "success",
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordValue, setPasswordValue] = useState("")
    const [confirmValue, setConfirmValue] = useState("")

    const closeAlert = () => {
        setAlertInfo({
            ...alertInfo,
            isOpen: false,
        })
    }

    const togglePassword = () => setShowPassword(!showPassword)
    const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword)

    async function handlerSubmit(event) {
        event.preventDefault()

        const form = new FormData(event.currentTarget)
        const nom_Users = form.get("nom_Users")
        const email = form.get("email")
        const hashed_Password = form.get("hashed_Password")
        const confirm_Password = form.get("confirm_Password")

        let emptyFields = false
        form.forEach((element) => {
            if (element === "") {
                emptyFields = true
            }
        })

        if (emptyFields) {
            setAlertInfo({
                isOpen: true,
                message: "Todos los campos son requeridos",
                type: "error",
            })
            return
        }

        if (hashed_Password !== confirm_Password) {
            setAlertInfo({
                isOpen: true,
                message: "La contraseña y la confirmación no coinciden",
                type: "error",
            })
            return
        }

        const body = {
            email: email,
            nom_Users: nom_Users,
            hashed_Password: hashed_Password,
            confirm_Password: confirm_Password,
        }

        try {
            const response = await SendData(body)
            setAlertInfo({
                isOpen: true,
                message: response.data.message || "¡Registro exitoso!",
                type: "success",
            })
        } catch (error) {
            let errorMessage = "Ha ocurrido un error durante el registro"
            if (error.response) {
                const { errors, status } = error.response.data
                if (status === 400) {
                    errorMessage = "Error en el formulario. Por favor revise los datos ingresados."
                }
                if (errors) {
                    errorMessage = Object.values(errors).flat().join(", ")
                }
            }
            setAlertInfo({
                isOpen: true,
                message: errorMessage,
                type: "error",
            })
        }
    }

    return (
        <>
            <PublicNav />
            <div className={styles.wrapper}>
                <div className={`col-md-6 ${styles.form_box} d-flex align-items-center justify-content-center`}>
                    <form className={styles.form} onSubmit={handlerSubmit}>
                        <h1 className={styles.title}>Registrarse</h1>

                        {/* Nombre de usuario */}
                        <div className={styles.input_box}>
                            <input type="text" id="nom_Users" name="nom_Users" placeholder="Usuario" />
                            <FaUser className={styles.icon} />
                        </div>

                        {/* Correo */}
                        <div className={styles.input_box}>
                            <input type="email" id="email" name="email" placeholder="Correo" />
                            <FaEnvelope className={styles.icon} />
                        </div>

                        {/* Contraseña */}
                        <div className={styles.input_box}>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="hashed_Password"
                                name="hashed_Password"
                                placeholder="Contraseña"
                                value={passwordValue}
                                onChange={(e) => setPasswordValue(e.target.value)}
                            />
                            {passwordValue ? (
                                <span onClick={togglePassword} className={styles.icon} style={{ cursor: "pointer" }}>
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            ) : (
                                <FaLock className={styles.icon} />
                            )}
                        </div>

                        {/* Confirmar contraseña */}
                        <div className={styles.input_box}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirm_Password"
                                name="confirm_Password"
                                placeholder="Confirmar Contraseña"
                                value={confirmValue}
                                onChange={(e) => setConfirmValue(e.target.value)}
                            />
                            {confirmValue ? (
                                <span onClick={toggleConfirmPassword} className={styles.icon} style={{ cursor: "pointer" }}>
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            ) : (
                                <FaLock className={styles.icon} />
                            )}
                        </div>

                        <button type="submit" className={styles.button}>
                            Registrarse
                        </button>

                        <div className={styles.login_link}>
                            <p>
                                ¿Ya tiene una Cuenta? <a href="/user/login">Ingresar</a>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            <AlertModal
                isOpen={alertInfo.isOpen}
                message={alertInfo.message}
                type={alertInfo.type}
                onClose={closeAlert}
                redirectUrl={alertInfo.type === "success" ? "/user/login" : undefined}
            />
        </>
    )
}

export default RegisterPage
