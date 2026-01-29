export type RouterKit = {
  router: typeof import('./base').router
  publicProcedure: typeof import('./base').publicProcedure
  protectedProcedure: typeof import('./base').protectedProcedure
}