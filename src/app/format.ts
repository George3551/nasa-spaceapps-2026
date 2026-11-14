export function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Invalid timestamp' : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}
