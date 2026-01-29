import { defineNuxtPlugin } from '#app'
import { createControllers } from '../controllers'

export default defineNuxtPlugin(() => {
  const controllers = createControllers()
  return {
    provide: {
      ...controllers,
    },
  }
})
