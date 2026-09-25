import type { Status } from "@/db/schema";
import type { Dict } from "@/lib/i18n";

export default function StatusBadge({ status, t }: { status: Status; t: Dict }) {
  return <span className={`badge ${status}`}>{t[`status_${status}`]}</span>;
}
