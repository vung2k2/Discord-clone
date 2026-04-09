import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type ChatScrollProps = {
  chatRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  shouldLoadMore: boolean;
  loadMore: () => void;
  count: number;
};

export const useChatScroll = ({
  chatRef,
  bottomRef,
  shouldLoadMore,
  loadMore,
  count,
}: ChatScrollProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const isPaginatingRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);

  useEffect(() => {
    const topDiv = chatRef?.current;

    const handleScroll = () => {
      const scrollTop = topDiv?.scrollTop;

      if (scrollTop === 0 && shouldLoadMore && !isPaginatingRef.current) {
        previousScrollHeightRef.current = topDiv?.scrollHeight ?? 0;
        previousScrollTopRef.current = topDiv?.scrollTop ?? 0;
        isPaginatingRef.current = true;
        loadMore();
      }
    };

    topDiv?.addEventListener('scroll', handleScroll);

    return () => topDiv?.removeEventListener('scroll', handleScroll);
  }, [shouldLoadMore, loadMore, chatRef]);

  useLayoutEffect(() => {
    if (!isPaginatingRef.current) return;

    const topDiv = chatRef?.current;
    if (!topDiv) return;

    const newScrollHeight = topDiv.scrollHeight;
    const previousScrollHeight = previousScrollHeightRef.current;
    const previousScrollTop = previousScrollTopRef.current;

    topDiv.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
    isPaginatingRef.current = false;
  }, [count, chatRef]);

  useEffect(() => {
    const bottomDiv = bottomRef?.current;
    const topDiv = chatRef?.current;
    const shouldAutoScroll = () => {
      if (!hasInitialized && bottomDiv) {
        setHasInitialized(true);
        return true;
      }

      if (!topDiv) return false;

      const distanceFromBottom = topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;

      return distanceFromBottom <= 100;
    };

    if (shouldAutoScroll()) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [bottomRef, chatRef, count, hasInitialized]);
};
