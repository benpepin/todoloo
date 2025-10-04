export const getCurrentDate = (): string => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()
  
  return `${month}/${day}/${year}`
}

export const getCompletionTime = (totalMinutes: number): string => {
  const now = new Date()
  const completionTime = new Date(now.getTime() + totalMinutes * 60000)
  
  const hours = completionTime.getHours()
  const minutes = completionTime.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  
  return `${displayHours}:${displayMinutes} ${ampm}`
}

