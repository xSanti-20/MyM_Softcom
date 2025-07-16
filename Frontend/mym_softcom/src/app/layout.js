import { ToastProvider } from "@/components/ui/toast";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "M&M SOFTCOM",
  description: "Proyecto inspirado en gestion comercial",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/src/app/favicon.ico" sizes="any" />
      </head>
      <body className={inter.className}>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
