import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Controle financeiro da casa",
  description: "Controle compartilhado de Matheus e Karina",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
