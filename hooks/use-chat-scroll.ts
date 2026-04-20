import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type ChatScrollProps = {
  chatRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  shouldLoadMoreTop: boolean;
  loadMoreTop: () => void;
  shouldLoadMoreBottom: boolean;
  loadMoreBottom: () => void;
  autoScrollToBottom?: boolean;
  count: number;
};

export const useChatScroll = ({
  chatRef,
  bottomRef,
  shouldLoadMoreTop,
  loadMoreTop,
  shouldLoadMoreBottom,
  loadMoreBottom,
  autoScrollToBottom = true,
  count,
}: ChatScrollProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const paginationDirectionRef = useRef<'top' | 'bottom' | null>(null);
  const canTriggerPaginationRef = useRef(false);
  const previousScrollHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const lastDistanceFromBottomRef = useRef(Number.POSITIVE_INFINITY);
  const suppressScrollHandlerRef = useRef(false);

  useEffect(() => {
    const topDiv = chatRef?.current;

    const handleScroll = () => {
      if (!topDiv || paginationDirectionRef.current) {
        return;
      }

      if (suppressScrollHandlerRef.current) {
        return;
      }

      const scrollTop = topDiv.scrollTop;
      const distanceFromBottom = topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
      const isScrollingDown = scrollTop > lastScrollTopRef.current;

      if (!canTriggerPaginationRef.current) {
        lastScrollTopRef.current = scrollTop;
        lastDistanceFromBottomRef.current = distanceFromBottom;
        return;
      }

      if (scrollTop <= 40 && shouldLoadMoreTop) {
        previousScrollHeightRef.current = topDiv.scrollHeight;
        previousScrollTopRef.current = topDiv.scrollTop;
        paginationDirectionRef.current = 'top';
        loadMoreTop();

        lastScrollTopRef.current = scrollTop;
        lastDistanceFromBottomRef.current = distanceFromBottom;
        return;
      }

      const crossedBottomThreshold =
        lastDistanceFromBottomRef.current > 40 && distanceFromBottom <= 40;

      if (crossedBottomThreshold && isScrollingDown && shouldLoadMoreBottom) {
        previousScrollHeightRef.current = topDiv.scrollHeight;
        previousScrollTopRef.current = topDiv.scrollTop;
        paginationDirectionRef.current = 'bottom';
        loadMoreBottom();
      }

      lastScrollTopRef.current = scrollTop;
      lastDistanceFromBottomRef.current = distanceFromBottom;
    };

    topDiv?.addEventListener('scroll', handleScroll);

    return () => topDiv?.removeEventListener('scroll', handleScroll);
  }, [shouldLoadMoreTop, loadMoreTop, shouldLoadMoreBottom, loadMoreBottom, chatRef]);

  useLayoutEffect(() => {
    if (!paginationDirectionRef.current) return;

    const topDiv = chatRef?.current;
    if (!topDiv) return;

    const newScrollHeight = topDiv.scrollHeight;
    const previousScrollHeight = previousScrollHeightRef.current;

    if (paginationDirectionRef.current === 'top') {
      const previousScrollTop = previousScrollTopRef.current;

      suppressScrollHandlerRef.current = true;
      topDiv.scrollTo({
        top: newScrollHeight - previousScrollHeight + previousScrollTop,
      });
      paginationDirectionRef.current = null;
      requestAnimationFrame(() => {
        suppressScrollHandlerRef.current = false;
        lastScrollTopRef.current = topDiv.scrollTop;
        lastDistanceFromBottomRef.current =
          topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
      });
      return;
    }

    const previousScrollTop = previousScrollTopRef.current;
    suppressScrollHandlerRef.current = true;
    topDiv.scrollTo({
      top: previousScrollTop,
    });
    paginationDirectionRef.current = null;
    requestAnimationFrame(() => {
      suppressScrollHandlerRef.current = false;
      lastScrollTopRef.current = topDiv.scrollTop;
      lastDistanceFromBottomRef.current =
        topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
    });
  }, [count, chatRef]);

  useEffect(() => {
    const topDiv = chatRef?.current;

    if (!autoScrollToBottom) {
      canTriggerPaginationRef.current = true;

      if (topDiv) {
        lastScrollTopRef.current = topDiv.scrollTop;
        lastDistanceFromBottomRef.current =
          topDiv.scrollHeight - topDiv.scrollTop - topDiv.clientHeight;
      }

      return;
    }

    const bottomDiv = bottomRef?.current;

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
      suppressScrollHandlerRef.current = true;

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: hasInitialized ? 'smooth' : 'auto',
        });

        const latestTopDiv = chatRef?.current;
        if (latestTopDiv) {
          lastScrollTopRef.current = latestTopDiv.scrollTop;
          lastDistanceFromBottomRef.current =
            latestTopDiv.scrollHeight - latestTopDiv.scrollTop - latestTopDiv.clientHeight;
        }

        requestAnimationFrame(() => {
          suppressScrollHandlerRef.current = false;
          canTriggerPaginationRef.current = true;
        });
      }, 100);
      return;
    }

    canTriggerPaginationRef.current = true;
  }, [bottomRef, chatRef, count, hasInitialized, autoScrollToBottom]);
};
