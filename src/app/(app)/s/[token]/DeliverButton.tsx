"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deliverAction } from "./actions";

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 8000 });
  });
}

export default function DeliverButton({ token, label, confirmText }: { token: string; label: string; confirmText: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <>
      {failed && <div className="alert err">Error</div>}
      <button
        className="btn-big"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return;
          start(async () => {
            const pos = await getPosition();
            const res = await deliverAction(token, pos?.coords.latitude ?? null, pos?.coords.longitude ?? null);
            if (res.ok) router.replace(`/s/${token}?ok=1`);
            else setFailed(true);
          });
        }}
      >
        ✅ {label}
      </button>
    </>
  );
}
