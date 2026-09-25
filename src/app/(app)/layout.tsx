import Nav from "@/components/Nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <>
      <Nav session={session} />
      <main>{children}</main>
    </>
  );
}
