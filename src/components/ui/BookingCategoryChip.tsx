import type { StudioSession } from "@/lib/studio-assistant/types";
import { classifySession } from "@/lib/studio-assistant/session-classification";
import { CategoryChip } from "./CategoryChip";

export function BookingCategoryChip({ session }: { session: StudioSession }) {
  const category = classifySession(session);
  return category === "class" || category === "maintenance" ? <CategoryChip kind={category} /> : null;
}
