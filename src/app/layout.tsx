import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/bodoni-moda/latin-500.css";
import "@fontsource/bodoni-moda/latin-600.css";
import "@fontsource/archivo/latin-400.css";
import "@fontsource/archivo/latin-500.css";
import "@fontsource/archivo/latin-600.css";
import "@fontsource/archivo/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ronda-tawny-xi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: true, follow: true },
  title: {
    default: "CheckoutGuard — Monitoramento Inteligente de Jornada & Checkout para E-commerce",
    template: "%s · CheckoutGuard",
  },
  description:
    "Você paga caro por tráfego no Meta Ads? O CheckoutGuard percorre Home → Produto → Frete CEP → Checkout em Wake (Fbits SSR), Nuvemshop, Shopify e VTEX, detecta erro 500 Scriban camuflado em HTTP 200 e avisa no WhatsApp em ~30s — parando sempre antes do pagamento.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "CheckoutGuard",
    title: "CheckoutGuard — Descubra em 30s se o seu checkout está quebrando antes de perder vendas.",
    description:
      "Monitoramento inteligente de jornada e checkout para e-commerce brasileiro: trava Safe-Checkout sem pedido fantasma, proxy anti-SSRF e laudo auditável para agências e lojas.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
