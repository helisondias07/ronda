import type { Metadata } from "next";
import { Viewer } from "../viewer";

export const metadata: Metadata = {
  title: "Visor Interativo de Laudo",
  description:
    "Abra um report.json local do CheckoutGuard ou explore em 1 clique a demonstração de falha Scriban 500 e parada segura no checkout, sem login.",
};

export default function VisorPage() {
  return <Viewer embedded={false} defaultDemo="scriban" />;
}
