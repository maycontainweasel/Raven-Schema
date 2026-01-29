export function LR<T>(response: Array<any>[]) {
  if (Array.isArray(response) && response.length > 0) {
    const lastItem = response[response.length - 1]
    return lastItem as T
  }
}

export function LRS<T>(response: Array<any>[]) {
  return new Promise<T>((resolve, reject) => {
    const lrsDebug = false

    try {
      if (lrsDebug) console.log('🔧 Shared LRS processing response:', response)

      if (Array.isArray(response) && response.length > 0) {
        const lastItem = response[response.length - 1]

        if (lrsDebug) console.log('🔧 Shared LRS lastItem:', lastItem)
        resolve(lastItem as T)
      } else {
        if (lrsDebug) console.log('⚠️ Shared LRS no data found, resolving null')
        resolve(null as T)
      }
    } catch (error) {
      console.error('❌ Shared LRS error:', error)
      reject(error)
    }
  })
}
