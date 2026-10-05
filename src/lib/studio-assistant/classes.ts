import "server-only";
import { school } from "@/config/school";
import { studioAssistantFetch } from "./client";
// Shared read endpoint; callers keep their domain-specific normalization/cache.
export const fetchSchoolClasses = () => studioAssistantFetch(`/api/school/${school.id}/class`);
