/**
 * Format minutes into human-readable time string
 * @param minutes Number of minutes
 * @returns Formatted time string (e.g., "30 minutes", "1 hour", "2 hours 30m")
 */
export function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0
    ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m`
    : `${hours} hour${hours !== 1 ? 's' : ''}`
}
