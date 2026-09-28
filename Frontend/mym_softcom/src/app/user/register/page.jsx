"use client"

import PublicNav from "@/components/nav/PublicNav"
import AuthModal from "@/components/auth/AuthModal"

export default function RegisterPage() {
  return (
    <>
      <PublicNav />
      <AuthModal initialMode="register" />
    </>
  )
}
