// Web Worker for accurate time tracking
let intervalId: number | null = null
let startTime: number = 0
let pausedTime: number = 0

self.onmessage = function(e) {
  const { type, data } = e.data

  switch (type) {
    case 'START':
      startTime = Date.now() - pausedTime
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime
        self.postMessage({ type: 'TICK', elapsed })
      }, 100) // Update every 100ms for smooth display
      break

    case 'PAUSE':
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
        pausedTime = Date.now() - startTime
      }
      break

    case 'RESUME':
      startTime = Date.now() - pausedTime
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime
        self.postMessage({ type: 'TICK', elapsed })
      }, 100)
      break

    case 'STOP':
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      pausedTime = 0
      startTime = 0
      self.postMessage({ type: 'STOPPED' })
      break

    case 'RESET':
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      pausedTime = 0
      startTime = 0
      break
  }
}

