'use client';

import * as z from 'zod';
import axios from 'axios';
import qs from 'query-string';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useModal } from '@/hooks/use-modal.store';
import { EmojiPicker } from '../emoji-picker';
import { Field, FieldGroup } from '../ui/field';

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, string>;
  name: string;
  type: 'conversation' | 'channel';
}

const formSchema = z.object({
  content: z.string().min(1),
});

export const ChatInput = ({ apiUrl, query, name, type }: ChatInputProps) => {
  const { onOpen } = useModal();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: apiUrl,
        query,
      });

      await axios.post(url, values);

      const chatId = query.channelId || query.conversationId;
      if (chatId) {
        await queryClient.invalidateQueries({ queryKey: [`chat:${chatId}`] });
      }

      form.reset();
      requestAnimationFrame(() => {
        form.setFocus('content');
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => (
            <Field>
              <div className="relative p-4 pb-6">
                <button
                  type="button"
                  onClick={() => onOpen('messageFile', { apiUrl, query })}
                  className="absolute top-7 left-8 h-6 w-6 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                >
                  <Plus className="text-white dark:text-[#313338]" />
                </button>
                <Input
                  disabled={isLoading}
                  className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                  placeholder={`Message ${type === 'conversation' ? name : '#' + name}`}
                  {...field}
                />
                <div className="absolute top-7 right-8">
                  <EmojiPicker
                    onChange={(emoji: string) => field.onChange(`${field.value} ${emoji}`)}
                  />
                </div>
              </div>
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
};
