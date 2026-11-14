import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ronda — laudo da jornada, sem pagar e sem patch",
  description:
    "Percorre home até o checkout num fixture ou preview autorizado, gera laudo com evidência e para antes do pagamento. Não corrige a loja.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
