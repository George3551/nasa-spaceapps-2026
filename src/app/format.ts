export function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}
