import { z } from 'zod';
export const markerSchema = z.object({
  id: z.string().min(1),
  time: z.number().finite().nonnegative(),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export type Marker = z.infer<typeof markerSchema>;
