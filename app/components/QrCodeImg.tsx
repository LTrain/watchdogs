"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QrCodeImg({ value, size = 140 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--muted)",
          fontSize: 12,
        }}
      >
        QR…
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      style={{ borderRadius: 12, border: "1px solid var(--border)", background: "#fff" }}
    />
  );
}
