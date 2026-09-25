"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Opens the back camera, reads a Pharmalive QR and goes to its page. */
export default function Scanner({ hint, errorText, buttonText }: { hint: string; errorText: string; buttonText: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let scanner: import("qr-scanner").default | undefined;
    let done = false;
    (async () => {
      const QrScanner = (await import("qr-scanner")).default;
      scanner = new QrScanner(
        videoRef.current!,
        (result) => {
          if (done) return;
          const m = result.data.match(/\/s\/([A-Za-z0-9_-]+)/);
          const token = m ? m[1] : /^[A-Za-z0-9_-]{10,}$/.test(result.data) ? result.data : null;
          if (!token) return;
          done = true;
          navigator.vibrate?.(100);
          scanner?.stop();
          router.push(`/s/${token}`);
        },
        { preferredCamera: "environment", highlightScanRegion: true, returnDetailedScanResult: true },
      );
      try {
        await scanner.start();
      } catch {
        setError(true);
      }
    })();
    return () => scanner?.destroy();
  }, [open, router]);

  if (!open) {
    return (
      <button className="btn-big" onClick={() => setOpen(true)}>
        📷 {buttonText}
      </button>
    );
  }
  return (
    <div>
      {error ? <div className="alert err">{errorText}</div> : <p className="muted">{hint}</p>}
      <video id="scanner-video" ref={videoRef} muted playsInline />
    </div>
  );
}
