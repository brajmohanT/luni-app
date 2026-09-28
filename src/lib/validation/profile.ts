import { z } from 'zod';

export const preferredNameSchema = z.object({
  preferredName: z.string().trim().min(1, 'Enter a name to continue.').max(40, 'Use 40 characters or fewer.'),
});

export type PreferredNameFormValues = z.infer<typeof preferredNameSchema>;
