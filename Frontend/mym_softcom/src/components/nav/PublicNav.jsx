"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from 'next/image';
import { useMobile } from "@/hooks/use-mobile"

function PublicNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isMobile, isTablet } = useMobile()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!isMobile && !isTablet) {
      setIsMobileMenuOpen(false)
    }
  }, [isMobile, isTablet])

  return (
    <>
      <nav className="bg-black shadow-lg relative z-40">
        <div className="container mx-auto flex items-center justify-between p-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/">
              <Image
                src="/assets/img/mymsoftcom.png"
                alt="M&M Softcom"
                width={isMobile ? 40 : isTablet ? 50 : 65}
                height={isMobile ? 35 : isTablet ? 45 : 60}
                className="transition-all duration-300"
              />
            </Link>
          </div>

          {/* Botón escritorio */}
          {!isMobile && !isTablet && (
            <div className="flex-shrink-0">
              <Button
                asChild
                variant="secondary"
                className="text-sm text-black hover:brightness-110"
                style={{ backgroundColor: "#947c4c" }}
              >
                <Link href="/user/login">Ingresar</Link>
              </Button>
            </div>
          )}

          {/* Botón hamburguesa */}
          {(isMobile || isTablet) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="text-[#947c4c] hover:bg-[#947c4c]/20"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          )}
        </div>

        {/* Menú móvil */}
        {(isMobile || isTablet) && isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={closeMobileMenu} />

            <div className="fixed top-0 left-0 right-0 bg-black shadow-lg z-50 animate-slide-down p-4">
              <div className="container mx-auto flex flex-col space-y-4">
                <div className="flex justify-between items-center border-b border-[#947c4c]/20 pb-4">
                  <div className="flex items-center space-x-3">
                    <Image src="/assets/img/mymsoftcom.png" alt="M&M Softcom" width={40} height={35} />
                    <span className="text-[#947c4c] font-bold text-lg">M&M Softcom</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeMobileMenu}
                    className="text-[#947c4c] hover:bg-[#947c4c]/20"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                <div>
                  <Button
                    asChild
                    className="w-full bg-[#947c4c] text-black hover:bg-[#80653d] font-medium"
                  >
                    <Link href="/user/login" onClick={closeMobileMenu}>
                      Ingresar
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export default PublicNav
