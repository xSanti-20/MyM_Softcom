"use client"

import { useRouter } from "next/navigation"
import styles from "./AlertModal.module.css"
import PropTypes from "prop-types"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

const AlertModal = ({ isOpen, message, type = "info", onClose, redirectUrl, onClick }) => {
  const router = useRouter()

  if (!isOpen) return null

  const handleAccept = () => {
    onClose?.()
    onClick?.()
    if (redirectUrl && type === "success") {
      router.push(redirectUrl)
    }
  }

  const titleMap = {
    success: "¡Éxito!",
    error: "Error",
    info: "Información"
  }

  const iconMap = {
    success: <CheckCircle className="w-12 h-12 text-pink-600 mx-auto mb-3" strokeWidth={1.5} />,
    error: <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" strokeWidth={1.5} />,
    info: <Info className="w-12 h-12 text-blue-600 mx-auto mb-3" strokeWidth={1.5} />
  }

  const modalClass = `${styles.modalContent} ${styles[type] || styles.info}`

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="alert-title">
      <div className={styles.modal}>
        <div className={modalClass}>
          {iconMap[type] || iconMap.info}
          <h2 id="alert-title">{titleMap[type] || titleMap.info}</h2>
          <p>{message}</p>
          <button className={styles.acceptButton} onClick={handleAccept}>
            ✓ Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

AlertModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["success", "error", "info"]),
  onClose: PropTypes.func,
  onClick: PropTypes.func,
  redirectUrl: PropTypes.string
}

export default AlertModal
