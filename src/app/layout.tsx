import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ronda-tawny-xi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: true, follow: true },
  title: {
    default: "Ronda — Laudo de Jornada E-commerce para Agências e Lojas (Sem Pagar, Sem Patch)",
    template: "%s · Ronda",
  },
  description:
    "Vistoria automatizada da jornada Home → Produto → Carrinho → Checkout para Wake (Fbits SSR), Nuvemshop, Shopify e VTEX. Para antes do pagamento, detecta erro 500 Scriban e não altera o site.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Ronda",
    title: "Ronda — Laudo da jornada de compra, com prova. Sem alterar a loja.",
    description:
      "QA de jornada e-commerce com trava Safe-Checkout, proxy anti-SSRF e visor interativo de evidências para agências e operações.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
