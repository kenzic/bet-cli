export function formatDate(iso?: string): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  // Pretty print the date in local time
  return date.toLocaleString();
}
