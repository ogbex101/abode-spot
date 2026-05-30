export function formatPrice(price: number, listing: "sale" | "rent" = "sale"): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
  return listing === "rent" ? `${formatted}/mo` : formatted;
}

export function truncate(text: string, max = 100): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
