import { useSocket } from '@/components/provider/socket-provider';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import qs from 'query-string';
import { useEffect, useState } from 'react';
import type { Member, Message, Profile } from '@/generated/prisma/client';

interface ChatQueryProps {
  queryKey: string;
  apiUrl: string;
  paramKey: 'channelId' | 'conversationId';
  paramValue: string;
  targetMessageId?: string;
}

type MessageWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  };
};

interface ChatMessagesResponse {
  items: MessageWithMemberWithProfile[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  highlightMessageId?: string;
}

type PageParam = {
  cursor?: string;
  direction: 'older' | 'newer';
};

export const useChatQuery = ({
  queryKey,
  apiUrl,
  paramKey,
  paramValue,
  targetMessageId,
}: ChatQueryProps) => {
  const { isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>();

  const fetchMessages = async ({ pageParam }: { pageParam: PageParam | undefined }) => {
    const url = qs.stringifyUrl(
      {
        url: apiUrl,
        query: {
          cursor: pageParam?.cursor,
          direction: pageParam?.direction ?? 'older',
          [paramKey]: paramValue,
        },
      },
      { skipNull: true },
    );

    const res = await fetch(url);
    return (await res.json()) as ChatMessagesResponse;
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    status,
  } = useInfiniteQuery({
    queryKey: [queryKey],
    queryFn: fetchMessages,
    initialPageParam: undefined as PageParam | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.nextCursor
        ? {
            cursor: lastPage.nextCursor,
            direction: 'older' as const,
          }
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage?.prevCursor
        ? {
            cursor: firstPage.prevCursor,
            direction: 'newer' as const,
          }
        : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: isConnected ? false : 1000,
  });

  useEffect(() => {
    if (!targetMessageId) return;

    const jumpToMessage = async () => {
      try {
        const jumpEndpoint =
          paramKey === 'channelId' ? '/api/messages/jump' : '/api/direct-messages/jump';

        const url = qs.stringifyUrl(
          {
            url: jumpEndpoint,
            query: {
              targetMessageId,
              [paramKey]: paramValue,
            },
          },
          { skipNull: true },
        );

        const res = await fetch(url);
        if (!res.ok) return;

        const jumpData = (await res.json()) as ChatMessagesResponse;
        setHighlightedMessageId(jumpData.highlightMessageId);

        queryClient.setQueryData([queryKey], {
          pages: [
            {
              items: jumpData.items,
              nextCursor: jumpData.nextCursor,
              prevCursor: jumpData.prevCursor,
            },
          ],
          pageParams: [undefined],
        });

        setTimeout(() => {
          const messageElement = document.getElementById(`message-${targetMessageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } catch (error) {
        console.error('[JUMP_TO_MESSAGE]', error);
      }
    };

    void jumpToMessage();
  }, [targetMessageId, paramKey, paramValue, queryClient, queryKey]);

  return {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    fetchPreviousPage,
    hasPreviousPage,
    isFetchingPreviousPage,
    status,
    highlightedMessageId,
  };
};
