import { ChannelType } from '@/generated/prisma/enums';
import z from 'zod';

export const serverFormSchema = z.object({
  name: z.string().min(1, {
    message: 'Server name is required.',
  }),
  imageUrl: z.string().min(1, {
    message: 'Server image is required.',
  }),
});

export type ServerForm = z.infer<typeof serverFormSchema>;

export const channelFormSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: 'Channel name is required.',
    })
    .refine((name) => name !== 'general', {
      message: "Channel name cannot be 'general'",
    }),
  type: z.enum(Object.values(ChannelType) as string[]),
});

export type ChannelForm = z.infer<typeof channelFormSchema>;
