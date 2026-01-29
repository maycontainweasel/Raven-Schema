import { t } from '@schema/server/trpc/context';
import { testimonialRouter as generatedTestimonialRouter } from './generated/testimonial';

const customTestimonialRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const testimonialRouter = t.mergeRouters(generatedTestimonialRouter, customTestimonialRouter);
export type TestimonialRouter = typeof testimonialRouter;
