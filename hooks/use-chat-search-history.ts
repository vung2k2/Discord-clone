import { useEffect, useMemo, useState } from 'react';

import {
  SEARCH_HISTORY_MAX,
  SearchHistoryItem,
  stripFilterTokens,
} from '@/components/chat/search/utils';

const parseHistoryItem = (item: unknown): SearchHistoryItem | null => {
  if (typeof item === 'string') {
    const fallbackQuery = stripFilterTokens(item).trim();

    if (!fallbackQuery) {
      return null;
    }

    return {
      query: fallbackQuery,
      fromUser: null,
      inChannel: null,
    };
  }

  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as {
    query?: unknown;
    fromUser?: unknown;
    inChannel?: unknown;
  };

  const query = typeof candidate.query === 'string' ? candidate.query.trim() : '';
  const fromUser =
    candidate.fromUser &&
    typeof candidate.fromUser === 'object' &&
    typeof (candidate.fromUser as { profileId?: unknown }).profileId === 'string' &&
    typeof (candidate.fromUser as { name?: unknown }).name === 'string'
      ? {
          profileId: (candidate.fromUser as { profileId: string }).profileId,
          name: (candidate.fromUser as { name: string }).name,
          imageUrl:
            typeof (candidate.fromUser as { imageUrl?: unknown }).imageUrl === 'string'
              ? (candidate.fromUser as { imageUrl: string }).imageUrl
              : null,
        }
      : null;
  const inChannel =
    candidate.inChannel &&
    typeof candidate.inChannel === 'object' &&
    typeof (candidate.inChannel as { channelId?: unknown }).channelId === 'string' &&
    typeof (candidate.inChannel as { name?: unknown }).name === 'string'
      ? {
          channelId: (candidate.inChannel as { channelId: string }).channelId,
          name: (candidate.inChannel as { name: string }).name,
        }
      : null;

  if (!query && !fromUser && !inChannel) {
    return null;
  }

  return { query, fromUser, inChannel };
};

export const useChatSearchHistory = (scopeKey: string) => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const storageKey = useMemo(() => `chat-search-history:${scopeKey || 'global'}`, [scopeKey]);

  const saveHistoryToStorage = (items: SearchHistoryItem[]) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignore storage write errors.
    }
  };

  const pushSearchHistory = (entry: SearchHistoryItem) => {
    const normalizedQuery = entry.query.trim();
    const hasFilterOnly = Boolean(entry.fromUser || entry.inChannel);

    if (!normalizedQuery && !hasFilterOnly) {
      return;
    }

    setSearchHistory((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(
            item.query.trim().toLowerCase() === normalizedQuery.toLowerCase() &&
            item.fromUser?.profileId === entry.fromUser?.profileId &&
            item.inChannel?.channelId === entry.inChannel?.channelId
          ),
      );
      const next = [
        {
          query: normalizedQuery,
          fromUser: entry.fromUser,
          inChannel: entry.inChannel,
        },
        ...deduped,
      ].slice(0, SEARCH_HISTORY_MAX);

      saveHistoryToStorage(next);
      return next;
    });
  };

  const clearAllHistory = () => {
    setSearchHistory([]);

    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage remove errors.
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        setSearchHistory([]);
        return;
      }

      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        setSearchHistory([]);
        return;
      }

      const validItems = parsed
        .map(parseHistoryItem)
        .filter((item): item is SearchHistoryItem => Boolean(item))
        .slice(0, SEARCH_HISTORY_MAX);

      setSearchHistory(validItems);
    } catch {
      setSearchHistory([]);
    }
  }, [storageKey]);

  return {
    searchHistory,
    pushSearchHistory,
    clearAllHistory,
  };
};
