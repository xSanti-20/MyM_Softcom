"use client"

import PublicNav from "@/components/nav/PublicNav"
import AuthModal from "@/components/auth/AuthModal"

export default function LoginPage() {
  return (
    <>
      <PublicNav />
      <AuthModal initialMode="login" />
    </>
  )
}
