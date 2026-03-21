const DIRECT_TYPESENSE_MESSAGE =
  'Direct browser Typesense access is disabled. Use the server-backed useTypesense() composable instead.'

const createDisabledClient = (): any => {
  const callable = () => {
    throw new Error(DIRECT_TYPESENSE_MESSAGE)
  }

  return new Proxy(callable, {
    get() {
      return createDisabledClient()
    },
    apply() {
      throw new Error(DIRECT_TYPESENSE_MESSAGE)
    },
  })
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      typesense: createDisabledClient(),
    },
  }
})
