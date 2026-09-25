import { redirect } from "next/navigation";
import { homeFor, requireUser } from "@/lib/auth";

export default async function Home() {
  const s = await requireUser();
  redirect(homeFor(s.role));
}
