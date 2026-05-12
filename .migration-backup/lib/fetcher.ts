export async function safeFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`Invalid JSON from ${url}`)
  }
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}
