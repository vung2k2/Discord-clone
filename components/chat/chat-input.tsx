'use client';

import * as z from 'zod';
import axios from 'axios';
import qs from 'query-string';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import type { Member, Message, Profile } from '@/generated/prisma/client';

import { Textarea } from '@/components/ui/textarea';
import { useModal } from '@/hooks/use-modal.store';
import { EmojiPicker } from '../emoji-picker';
import { Field, FieldGroup } from '../ui/field';

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, string>;
  name: string;
  type: 'conversation' | 'channel';
  currentMember: Member & { profile: Profile };
}

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  };
  isOptimistic?: boolean;
};

type PaginatedMessages = {
  pages: Array<{
    items: MessageWithMemberWithProfile[];
    nextCursor?: string;
  }>;
  pageParams?: unknown[];
};

const formSchema = z.object({
  content: z.string().min(1),
});

export const ChatInput = ({ apiUrl, query, name, type, currentMember }: ChatInputProps) => {
  const { onOpen } = useModal();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const chatId = query.channelId || query.conversationId;
    const optimisticId = `optimistic:${chatId ?? 'chat'}:${form.formState.submitCount + 1}:${values.content}`;
    const now = new Date();

    const optimisticMessage: MessageWithMemberWithProfile = {
      id: optimisticId,
      content: values.content,
      fileUrl: null,
      fileName: null,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      memberId: currentMember.id,
      channelId: query.channelId ?? '',
      member: currentMember,
      isOptimistic: true,
    };

    if (chatId) {
      queryClient.setQueryData([`chat:${chatId}`], (oldData: PaginatedMessages | undefined) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [
              {
                items: [optimisticMessage],
              },
            ],
            pageParams: [undefined],
          };
        }

        const newPages = [...oldData.pages];
        newPages[0] = {
          ...newPages[0],
          items: [optimisticMessage, ...newPages[0].items],
        };

        return {
          ...oldData,
          pages: newPages,
          pageParams: oldData.pageParams,
        };
      });
    }

    form.setValue('content', '', {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    requestAnimationFrame(() => {
      form.setFocus('content');
    });

    void (async () => {
      try {
        const url = qs.stringifyUrl({
          url: apiUrl,
          query,
        });

        const { data } = await axios.post<MessageWithMemberWithProfile>(url, values);

        if (chatId) {
          queryClient.setQueryData([`chat:${chatId}`], (oldData: PaginatedMessages | undefined) => {
            if (!oldData || !oldData.pages || oldData.pages.length === 0) {
              return {
                pages: [
                  {
                    items: [data],
                  },
                ],
                pageParams: [undefined],
              };
            }

            const cleanedPages = oldData.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== optimisticId),
            }));

            const alreadyExists = cleanedPages.some((page) =>
              page.items.some((item) => item.id === data.id),
            );

            if (alreadyExists) {
              return {
                ...oldData,
                pages: cleanedPages,
                pageParams: oldData.pageParams,
              };
            }

            const newPages = [...cleanedPages];
            newPages[0] = {
              ...newPages[0],
              items: [data, ...newPages[0].items],
            };

            return {
              ...oldData,
              pages: newPages,
              pageParams: oldData.pageParams,
            };
          });
        }
      } catch (error) {
        if (chatId) {
          queryClient.setQueryData([`chat:${chatId}`], (oldData: PaginatedMessages | undefined) => {
            if (!oldData || !oldData.pages || oldData.pages.length === 0) {
              return oldData;
            }

            const newPages = oldData.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== optimisticId),
            }));

            return {
              ...oldData,
              pages: newPages,
              pageParams: oldData.pageParams,
            };
          });
        }

        console.log(error);
      }
    })();
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
                <Textarea
                  className="min-h-0 resize-none px-14 py-3 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                  placeholder={`Message ${type === 'conversation' ? name : '#' + name}`}
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
                      return;
                    }

                    event.preventDefault();
                    void form.handleSubmit(onSubmit)();
                  }}
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
