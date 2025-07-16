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
    <main className="w-full min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
      {/* Hero */}
      <section className="relative py-16 md:py-24 text-center">
        <div className="relative container mx-auto px-4 max-w-6xl">
          <Badge
            variant="outline"
            className="mb-6 text-lg px-4 py-2"
            style={{ backgroundColor: "var(--color-amarillo)", color: "#000" }}
          >
            Gestión Comercial Inmobiliaria
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ color: "var(--color-amarillo)" }}>
            M & M Softcom
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mt-6">
            Plataforma web desarrollada para optimizar los procesos de ventas, recaudo y cartera en proyectos inmobiliarios.
          </p>
        </div>
      </section>

      {/* Bienvenida */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`${isMobile ? "order-2" : "order-1"} space-y-6`}>
              <Badge
                variant="secondary"
                className="text-black"
                style={{ backgroundColor: "var(--color-amarillo)" }}
              >
                M & M Constructora
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight" style={{ color: "var(--color-amarillo)" }}>
                Bienvenido a tu sistema de gestión inmobiliaria
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Simplificamos la administración de clientes, proyectos, planes de financiación, ventas y pagos, brindando control total en cada etapa del proceso.
                Visualiza los abonos, cuotas pendientes y moras de forma clara, con reportes en tiempo real para mejorar tu toma de decisiones.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
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
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "var(--color-amarillo)" }}>
              Funcionalidades Destacadas
            </h2>
            <p className="text-lg text-gray-300">Automatización, trazabilidad y eficiencia para tu negocio</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card
                  key={index}
                  className="group shadow-lg border-0 bg-gray-800 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-2"
                >
                  <CardContent className="p-0">
                    {/* Imagen centrada con tamaño adecuado */}
                    <div className="w-full flex justify-center pt-6 px-6">
                      <Image
                        src={feature.img || "/placeholder.svg"}
                        alt={feature.title}
                        width={220}
                        height={160}
                        className="rounded-md object-contain"
                      />
                    </div>

                    {/* Badge separado debajo de la imagen */}
                    <div className="px-6 pt-4">
                      <Badge style={{ backgroundColor: "var(--color-amarillo)", color: "#000" }}>
                        {feature.badge}
                      </Badge>
                    </div>

                    {/* Contenido textual */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <IconComponent className="w-6 h-6" style={{ color: "var(--color-amarillo)" }} />
                        <h3 className="text-xl font-semibold" style={{ color: "var(--color-amarillo)" }}>
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-6 text-center" style={{ color: "var(--color-amarillo)" }}>
        <div className="container mx-auto px-4 max-w-6xl">
          <p className="text-sm">© 2025 M&M Constructora. Todos los derechos reservados.</p>
        </div>
      </footer>
    </main>
  )
}

export default HomePage
