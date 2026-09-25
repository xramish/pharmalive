import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/db/schema";

export const SESSION_COOKIE = "pl_session";
export type Session = { uid: number; role: Role; name: string };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signSession(s: Session) {
  return new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
