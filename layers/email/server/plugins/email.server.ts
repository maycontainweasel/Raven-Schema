export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const ctx = (event as any).context || ((event as any).context = {})
    const schemaExt = (ctx.schemaExt ||= {})
    schemaExt.email = createEmailClient()
  })
})

function createEmailClient() {
  return {
    send: async (payload: {
      to: string
      subject: string
      body: string
    }) => {
      console.log('[email] send', payload)
      return { ok: true }
    },
  }
}
