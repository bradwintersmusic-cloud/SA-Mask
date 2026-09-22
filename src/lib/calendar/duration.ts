export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} ${hours === 1 ? "hr" : "hrs"}` : "", remainder || !hours ? `${remainder} min` : ""].filter(Boolean).join(" ");
}
