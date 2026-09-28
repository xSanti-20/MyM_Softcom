"use client"

import PublicNav from "@/components/nav/PublicNav"
import AuthModal from "@/components/auth/AuthModal"

export default function PasswordPage() {
  return (
    <>
      <PublicNav />
      <AuthModal initialMode="recover" />
    </>
  )
}
