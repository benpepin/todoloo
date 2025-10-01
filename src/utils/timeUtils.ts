export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} mins`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const getCurrentDate = (): string => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()
  
  return `${month}/${day}/${year}`
}

