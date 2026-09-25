"use client";

import { useEffect } from "react";

export default function PrintButton({ label, auto }: { label: string; auto?: boolean }) {
  useEffect(() => {
    if (auto) setTimeout(() => window.print(), 300);
  }, [auto]);
  return <button onClick={() => window.print()}>🖨 {label}</button>;
}
