"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useMobile } from "@/hooks/use-mobile"
import { MapPin, Users, Award } from "lucide-react"
import Image from "next/image"

function HomePage() {
  const { isMobile } = useMobile()

  const features = [
    {
      img: "/assets/img/reservas.png",
      title: "Ubicación Premium",
      description: "Proyectos estratégicamente ubicados en zonas de alta valorización.",
      icon: MapPin,
      badge: "Ubicación",
    },
    {
      img: "/assets/img/luxury.png",
      title: "Planes Flexibles",
      description: "Opciones de financiación adaptadas a cada cliente y proyecto.",
      icon: Award,
      badge: "Financiación",
    },
    {
      img: "/assets/img/malibu.png",
      title: "Gestión Responsable",
      description: "Cada proyecto es respaldado por responsables capacitados para garantizar confianza y transparencia.",
      icon: Users,
      badge: "Gestión",
    },
  ]

  return (
    <main className="w-full min-h-screen" style={{ background: "linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)" }}>
      {/* Hero */}
      <section className="relative py-20 md:py-32">
        <div className="relative container mx-auto px-4 max-w-6xl text-center">
          <Badge
            variant="outline"
            className="mb-6 text-lg px-6 py-2 border-pink-300"
            style={{ backgroundColor: "rgba(233, 30, 99, 0.1)", color: "#2c3e50" }}
          >
            ✨ Gestión Comercial Inmobiliaria
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6" style={{ color: "#2c3e50" }}>
            M & M Softcom
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto" style={{ color: "#2c3e50" }}>
            Plataforma profesional para optimizar ventas, recaudo y cartera en proyectos inmobiliarios
          </p>
        </div>
      </section>

      {/* Bienvenida */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`${isMobile ? "order-2" : "order-1"} space-y-6`}>
              <Badge
                className="text-white"
                style={{ backgroundColor: "var(--primary-color)" }}
              >
                🏢 M & M Constructora
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: "var(--text-dark)" }}>
                Tu Sistema de Gestión Inmobiliaria Completo
              </h2>
              <p className="text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Simplificamos la administración de clientes, proyectos, planes de financiación, ventas y pagos. 
                Visualiza abonos, cuotas pendientes y moras con reportes en tiempo real.
              </p>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg" style={{ boxShadow: "var(--shadow-lg)" }}>
              <Image
                src="/assets/img/mymsoftcom.png"
                alt="Sistema de Gestión"
                width={600}
                height={400}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--primary-color)" }}>
              ✨ Funcionalidades Destacadas
            </h2>
            <p className="text-lg" style={{ color: "var(--text-muted)" }}>Automatización, trazabilidad y eficiencia para tu negocio</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card
                  key={index}
                  className="group shadow-md border border-pink-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer"
                  style={{ 
                    background: "linear-gradient(135deg, white 0%, var(--bg-light) 100%)",
                  }}
                >
                  <CardContent className="p-0">
                    {/* Imagen */}
                    <div className="w-full flex justify-center pt-6 px-6">
                      <Image
                        src={feature.img || "/placeholder.svg"}
                        alt={feature.title}
                        width={220}
                        height={160}
                        className="rounded-md object-contain"
                      />
                    </div>

                    {/* Badge */}
                    <div className="px-6 pt-4">
                      <Badge style={{ 
                        backgroundColor: "var(--primary-color)", 
                        color: "white" 
                      }}>
                        {feature.badge}
                      </Badge>
                    </div>

                    {/* Contenido */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <IconComponent className="w-6 h-6" style={{ color: "var(--primary-color)" }} />
                        <h3 className="text-lg font-bold" style={{ color: "var(--text-dark)" }}>
                          {feature.title}
                        </h3>
                      </div>
                      <p className="leading-relaxed" style={{ color: "var(--text-muted)" }}>{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-pink-200" style={{ 
        backgroundColor: "white",
        color: "#2c3e50"
      }}>
        <div className="container mx-auto px-4 max-w-6xl">
          <p className="text-sm opacity-90">© 2025 M&M Constructora. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  )
}

export default HomePage
