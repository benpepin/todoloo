export const getCurrentDate = (): string => {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const year = now.getFullYear()
  
  return `${month}/${day}/${year}`
}

