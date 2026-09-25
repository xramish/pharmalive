import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

export async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/** QR contains a link, so any phone camera opens the invoice page directly. */
export async function qrSvg(token: string) {
  return QRCode.toString(`${await appOrigin()}/s/${token}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
