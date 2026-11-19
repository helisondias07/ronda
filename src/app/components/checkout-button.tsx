"use client";

import { useState } from "react";

export function CheckoutButton({
  planId,
  fallbackHref,
  label,
  variant = "quiet",
}: {
  planId: string;
  fallbackHref: string;
  label: string;
  variant?: "primary" | "quiet";
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function startCheckout(): Promise<void> {
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("resposta sem URL");
      window.location.assign(data.url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <span className="cg-fallback">
        Pagamento indisponível agora —{" "}
        <a href={fallbackHref}>contrate por e-mail</a> que configuramos juntos.
      </span>
    );
  }

  return (
    <button
      type="button"
      className={variant === "primary" ? "cg-cta" : "cg-cta-quiet"}
      onClick={() => void startCheckout()}
      disabled={busy}
    >
      {busy ? "Abrindo pagamento…" : label}
    </button>
  );
}
