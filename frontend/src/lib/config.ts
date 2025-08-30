export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function buildUrl(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${trimmed}`;
}



