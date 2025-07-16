"use client"
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa"

function StockAlert({ existence, foodName }) {
  const STOCK_MIN_THRESHOLD = 100 // Mismo umbral que en el backend

  const getAlertLevel = (stockLevel) => {
    if (stockLevel <= STOCK_MIN_THRESHOLD * 0.25) return "critical"
    else if (stockLevel <= STOCK_MIN_THRESHOLD * 0.5) return "high"
    else if (stockLevel < STOCK_MIN_THRESHOLD) return "moderate"
    else return "normal"
  }

  const alertLevel = getAlertLevel(existence)

  const getAlertConfig = () => {
    switch (alertLevel) {
      case "critical":
        return {
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: <FaExclamationTriangle className="text-red-600" />,
          message: "Stock Crítico",
        }
      case "high":
        return {
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          icon: <FaExclamationTriangle className="text-orange-600" />,
          message: "Stock Bajo",
        }
      case "moderate":
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: <FaExclamationTriangle className="text-yellow-600" />,
          message: "Stock Moderado",
        }
      default:
        return {
          color: "text-green-600",
          bgColor: "bg-green-100",
          icon: <FaCheckCircle className="text-green-600" />,
          message: "Stock Normal",
        }
    }
  }

  const config = getAlertConfig()

  if (alertLevel === "normal") {
    return (
      <div className="flex items-center space-x-2">
        {config.icon}
        <span className={config.color}>{existence} KG</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 p-2 rounded-md ${config.bgColor}`}>
      {config.icon}
      <div className="flex flex-col">
        <span className={`font-semibold ${config.color}`}>{existence} KG</span>
        <span className={`text-xs ${config.color}`}>{config.message}</span>
      </div>
    </div>
  )
}

export default StockAlert
