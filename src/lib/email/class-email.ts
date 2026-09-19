import type { StudioClass, StudioUser } from "@/lib/studio-assistant/enrollment-types";
export function classEmail(course: StudioClass, users: StudioUser[]) {
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const user of users) {
    const email = user.email?.trim();
    // Exclude malformed addresses and mailto/header delimiters; never guess corrections.
    if (!email || !/^[^\s@,;:?&#<>"\\]+@[^\s@,;:?&#<>"\\]+\.[^\s@,;:?&#<>"\\]+$/.test(email)) continue;
    const key = email.toLowerCase();
    if (!seen.has(key)) { seen.add(key); recipients.push(email); }
  }
  const subject = (course.name ?? course.code ?? `Class #${course.id}`).replace(/[\r\n]/g, " ");
  const mailto = `mailto:?bcc=${encodeURIComponent(recipients.join(","))}&subject=${encodeURIComponent(subject)}`;
  return { recipients, subject, mailto, unusuallyLong: mailto.length > 2000 };
}
