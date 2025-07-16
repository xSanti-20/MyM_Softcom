"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaEnvelope } from "react-icons/fa";
import PublicNav from "@/components/nav/PublicNav";
import axiosInstance from "@/lib/axiosInstance.js";
import styles from "./page.module.css";

function PasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [msgSuccess, setMsgSuccess] = useState('');
    const router = useRouter();

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess(false);

        try {
            const response = await axiosInstance.post('/api/User/ResetPassUser', { Email: email });
            setMsgSuccess("Se ha enviado un correo con instrucciones para restablecer tu contraseña.");
            setSuccess(true);
        } catch (error) {
            setError(error.response?.data?.message || "Hubo un error. Intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (success) {
        return (
            <>
                <PublicNav />
                <div className={styles.alert_card}>
                    <h2>¡Correo enviado!</h2>
                    <p>{msgSuccess}</p>
                    <button className={styles.btn_primary} onClick={() => router.push("/user/login")}>
                        Continuar
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <PublicNav />
            <div className={styles.wrapper}>
                <div className={styles.container}>
                    <div className={styles.form_box}>
                        <form onSubmit={handleSubmit}>
                            <h1 className={styles.title}>Olvido Contraseña</h1>
                            <div className={styles.input_container}>
                                <h5 className={styles.label}>
                                    Ingrese su correo y le enviaremos un enlace para restablecer tu contraseña.
                                </h5>
                                <div className={styles.input_box}>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Correo"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <FaEnvelope className={styles.icon} />
                                </div>
                            </div>
                            {error && (
                                <p className={styles.error_message}>{error}</p>
                            )}
                            <button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Enviando...' : 'Cambiar Contraseña'}
                            </button>
                            <div className={styles.remember}>
                                <p>¿Recuerdas tu Contraseña? <a href="/user/login">Ingresar</a></p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

export default PasswordPage;
