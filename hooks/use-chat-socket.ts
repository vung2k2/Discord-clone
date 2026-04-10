import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Member, Message, Profile } from '@/generated/prisma/client';
import { useSocket } from '@/components/provider/socket-provider';

type ChatSocketProps = {
  addKey: string;
  updateKey: string;
  queryKey: string;
};

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

export const useChatSocket = ({ addKey, updateKey, queryKey }: ChatSocketProps) => {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on(updateKey, (message: MessageWithMemberWithProfile) => {
      queryClient.setQueryData([queryKey], (oldData: PaginatedMessages) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        const newData = oldData.pages.map((page) => {
          return {
            ...page,
            items: page.items.map((item) => {
              if (item.id === message.id) {
                return message;
              }
              return item;
            }),
          };
        });

        return {
          ...oldData,
          pages: newData,
        };
      });
    });

    socket.on(addKey, (message: MessageWithMemberWithProfile) => {
      queryClient.setQueryData([queryKey], (oldData: PaginatedMessages) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [
              {
                items: [message],
              },
            ],
            pageParams: [undefined],
          };
        }

        const alreadyExists = oldData.pages.some((page) =>
          page.items.some((item) => item.id === message.id),
        );

        if (alreadyExists) {
          return oldData;
        }

        // If the server message arrives before the POST response resolves,
        // remove one matching optimistic placeholder to avoid temporary duplicates.
        let optimisticRemoved = false;
        const cleanedPages = oldData.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => {
            if (optimisticRemoved || !item.isOptimistic) {
              return true;
            }

            const isSameAuthor = item.memberId === message.memberId;
            const isSameContent = item.content === message.content;
            const isSameFile = item.fileUrl === message.fileUrl;

            if (isSameAuthor && isSameContent && isSameFile) {
              optimisticRemoved = true;
              return false;
            }

            return true;
          }),
        }));

        const newData = [...cleanedPages];

        newData[0] = {
          ...newData[0],
          items: [message, ...newData[0].items],
        };

        return {
          ...oldData,
          pages: newData,
          pageParams: oldData.pageParams,
        };
      });
    });

    return () => {
      socket.off(addKey);
      socket.off(updateKey);
    };
  }, [queryClient, addKey, queryKey, socket, updateKey]);
};
