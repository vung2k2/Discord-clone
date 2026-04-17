'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChatSearchFilterMenu } from '@/components/chat/search/filter-menu';
import {
  buildSearchInput,
  createSearchParams,
  FilterChannel,
  FilterUser,
  SearchHistoryItem,
  SearchScope,
  SortBy,
  stripFilterTokens,
  withTrailingSpace,
} from '@/components/chat/search/utils';
import { useChatSearchHistory } from '@/hooks/use-chat-search-history';
import UserAvatar from '@/components/user-avatar';

type SearchResultItem = {
  messageId: string;
  type: 'channel' | 'conversation';
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  createdAt: string;
  memberName: string;
  memberImageUrl: string | null;
  channelName: string | null;
};

interface ChatSearchProps {
  type: 'channel' | 'conversation';
  name: string;
  email?: string;
  serverName?: string;
  searchScope?: SearchScope;
}

type FilterMenuView = 'root' | 'from' | 'in';

const highlightText = (text: string, query: string) => {
  const keyword = query.trim();

  if (!keyword) {
    return text;
  }

  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-200/80 px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const ChatSearch = ({ type, name, email, serverName, searchScope }: ChatSearchProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterMenuView, setFilterMenuView] = useState<FilterMenuView>('root');
  const [isFiltersLoading, setIsFiltersLoading] = useState(false);
  const [filterUsers, setFilterUsers] = useState<FilterUser[]>([]);
  const [filterChannels, setFilterChannels] = useState<FilterChannel[]>([]);
  const [selectedFromUser, setSelectedFromUser] = useState<FilterUser | null>(null);
  const [selectedInChannel, setSelectedInChannel] = useState<FilterChannel | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [error, setError] = useState('');

  const canSearch = Boolean(
    searchScope?.serverId || searchScope?.channelId || searchScope?.conversationId,
  );

  const placeholder = useMemo(() => {
    if (searchScope?.serverId && serverName) {
      return `Search in ${serverName}`;
    }

    if (type === 'channel') {
      return `Search in #${name}`;
    }

    return `Search in ${name === 'null null' ? email || 'conversation' : name}`;
  }, [type, name, email, searchScope?.serverId, serverName]);

  const scopeKey = `${searchScope?.serverId || ''}:${searchScope?.channelId || ''}:${searchScope?.conversationId || ''}`;
  const { searchHistory, pushSearchHistory, clearAllHistory } = useChatSearchHistory(scopeKey);

  useEffect(() => {
    setSearchValue('');
    setSubmittedQuery('');
    setResults([]);
    setError('');
    setIsSearchPanelOpen(false);
    setIsFilterMenuOpen(false);
    setFilterMenuView('root');
    setSelectedFromUser(null);
    setSelectedInChannel(null);
    setSortBy('relevance');
    setFilterUsers([]);
    setFilterChannels([]);
  }, [scopeKey]);

  useEffect(() => {
    const fetchFilters = async () => {
      if (
        !isFilterMenuOpen ||
        !searchScope?.serverId ||
        (filterUsers.length > 0 && filterChannels.length > 0)
      ) {
        return;
      }

      setIsFiltersLoading(true);

      try {
        const params = new URLSearchParams({ serverId: searchScope.serverId });
        const response = await fetch(`/api/elasticsearch/filters?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to load filters');
        }

        const data = (await response.json()) as {
          users?: FilterUser[];
          channels?: FilterChannel[];
        };

        setFilterUsers(data.users || []);
        setFilterChannels(data.channels || []);
      } catch (filtersError) {
        console.error('[CHAT_SEARCH_FILTERS_ERROR]', filtersError);
      } finally {
        setIsFiltersLoading(false);
      }
    };

    void fetchFilters();
  }, [isFilterMenuOpen, searchScope?.serverId, filterUsers.length, filterChannels.length]);

  const shouldShowPanel =
    isSearchPanelOpen &&
    (Boolean(submittedQuery.trim()) || Boolean(selectedFromUser || selectedInChannel));

  const executeSearch = async (args: {
    query: string;
    fromUser: FilterUser | null;
    inChannel: FilterChannel | null;
    sort: SortBy;
  }) => {
    const params = createSearchParams({
      query: args.query,
      scope: searchScope,
      fromUser: args.fromUser,
      inChannel: args.inChannel,
      sortBy: args.sort,
    });

    const response = await fetch(`/api/elasticsearch/messages?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const data = (await response.json()) as { items?: SearchResultItem[] };
    return data.items || [];
  };

  const runSearch = async (sortOverride?: SortBy) => {
    if (!canSearch) {
      return;
    }

    const query = stripFilterTokens(searchValue).trim();
    const hasFilterOnlySearch = Boolean(selectedFromUser || selectedInChannel);

    if (!query && !hasFilterOnlySearch) {
      setSubmittedQuery('');
      setResults([]);
      setError('');
      setIsSearchPanelOpen(false);
      return;
    }

    setIsSearching(true);
    setError('');
    setIsFilterMenuOpen(false);

    try {
      const items = await executeSearch({
        query,
        fromUser: selectedFromUser,
        inChannel: selectedInChannel,
        sort: sortOverride || sortBy,
      });

      pushSearchHistory({
        query,
        fromUser: selectedFromUser,
        inChannel: selectedInChannel,
      });

      setSubmittedQuery(query);
      setResults(items);
      setIsSearchPanelOpen(true);
    } catch (searchError) {
      console.error('[CHAT_SEARCH_ERROR]', searchError);
      setSubmittedQuery(query);
      setResults([]);
      setError('Search failed. Please try again.');
      setIsSearchPanelOpen(true);
    } finally {
      setIsSearching(false);
    }
  };

  const runSearchFromHistory = async (historyItem: SearchHistoryItem) => {
    if (!canSearch) {
      return;
    }

    const query = historyItem.query.trim();
    const fromUser = historyItem.fromUser;
    const inChannel = historyItem.inChannel;
    const hasFilterOnlySearch = Boolean(fromUser || inChannel);

    if (!query && !hasFilterOnlySearch) {
      return;
    }

    // Promote the selected history item to the top (MRU behavior).
    pushSearchHistory({
      query,
      fromUser,
      inChannel,
    });

    setSearchValue(buildSearchInput(query, fromUser, inChannel));
    setSelectedFromUser(fromUser);
    setSelectedInChannel(inChannel);
    setIsFilterMenuOpen(false);

    setIsSearching(true);
    setError('');

    try {
      const items = await executeSearch({
        query,
        fromUser,
        inChannel,
        sort: sortBy,
      });

      setSubmittedQuery(query);
      setResults(items);
      setIsSearchPanelOpen(true);
    } catch (searchError) {
      console.error('[CHAT_SEARCH_HISTORY_ERROR]', searchError);
      setSubmittedQuery(query);
      setResults([]);
      setError('Search failed. Please try again.');
      setIsSearchPanelOpen(true);
    } finally {
      setIsSearching(false);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    setIsFilterMenuOpen(false);
    void runSearch();
  };

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsFilterMenuOpen(false);
    void runSearch();
  };

  const onSortChange = (value: SortBy) => {
    setSortBy(value);

    if (isSearchPanelOpen) {
      void runSearch(value);
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    setSubmittedQuery('');
    setResults([]);
    setError('');
    setIsSearchPanelOpen(false);
    setFilterMenuView('root');
    setSelectedFromUser(null);
    setSelectedInChannel(null);
  };

  const onSearchInputChange = (value: string) => {
    setSearchValue(value);
    setIsFilterMenuOpen(true);

    if (value.trim() !== submittedQuery.trim()) {
      setIsSearchPanelOpen(false);
    }

    if (!value.trim()) {
      setSubmittedQuery('');
      setResults([]);
      setError('');
      setIsSearchPanelOpen(false);
      setSelectedFromUser(null);
      setSelectedInChannel(null);
    }
  };

  const insertFilterToken = (token: 'from:' | 'in:') => {
    if (token === 'from:') {
      setFilterMenuView('from');
      return;
    }

    setFilterMenuView('in');
  };

  const chooseFromUser = (user: FilterUser) => {
    const baseText = stripFilterTokens(searchValue);

    setSelectedFromUser(user);
    setSearchValue(withTrailingSpace(buildSearchInput(baseText, user, selectedInChannel)));
    setSubmittedQuery('');
    setIsSearchPanelOpen(false);
    setFilterMenuView('root');
    setIsFilterMenuOpen(true);
  };

  const chooseInChannel = (channel: FilterChannel) => {
    const baseText = stripFilterTokens(searchValue);

    setSelectedInChannel(channel);
    setSearchValue(withTrailingSpace(buildSearchInput(baseText, selectedFromUser, channel)));
    setSubmittedQuery('');
    setIsSearchPanelOpen(false);
    setFilterMenuView('root');
    setIsFilterMenuOpen(true);
  };

  if (!canSearch) {
    return null;
  }

  return (
    <>
      <Popover open={isFilterMenuOpen} onOpenChange={setIsFilterMenuOpen}>
        <form onSubmit={onSearchSubmit} className="relative w-44 md:w-72">
          <PopoverAnchor asChild>
            <div>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <Input
                value={searchValue}
                onChange={(event) => onSearchInputChange(event.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={() => setIsFilterMenuOpen(true)}
                placeholder={placeholder}
                className="h-8 pr-8 pl-8 text-sm"
                disabled={isSearching}
              />
              {searchValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 my-auto mr-1 h-6 w-6 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </PopoverAnchor>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="w-[320px] gap-0 p-0 sm:w-[420px]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <ChatSearchFilterMenu
              searchValue={searchValue}
              filterMenuView={filterMenuView}
              isFiltersLoading={isFiltersLoading}
              filterUsers={filterUsers}
              filterChannels={filterChannels}
              searchHistory={searchHistory}
              onBackToRoot={() => setFilterMenuView('root')}
              onOpenFrom={() => insertFilterToken('from:')}
              onOpenIn={() => insertFilterToken('in:')}
              onChooseFromUser={chooseFromUser}
              onChooseInChannel={chooseInChannel}
              onApplyHistoryItem={(item) => {
                void runSearchFromHistory(item);
              }}
              onClearHistory={clearAllHistory}
            />
          </PopoverContent>
        </form>
      </Popover>

      {shouldShowPanel && (
        <aside className="fixed top-12 right-0 bottom-0 z-40 w-full border-l border-neutral-200 bg-zinc-100 transition-transform duration-200 dark:border-neutral-800 dark:bg-[#2b2d31] sm:w-[360px]">
          <div className="flex h-full flex-col">
            <div className="flex h-12 items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                {isSearching ? 'Searching...' : `${results.length} Results`}
              </p>
              <div className="ml-auto w-36">
                <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortBy)}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem className="text-xs" value="relevance">
                      Most relevant
                    </SelectItem>
                    <SelectItem className="text-xs" value="newest">
                      Newest
                    </SelectItem>
                    <SelectItem className="text-xs" value="oldest">
                      Oldest
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {submittedQuery && (
              <p className="border-b border-neutral-200 px-4 py-2 text-xs text-zinc-500 dark:border-neutral-800 dark:text-zinc-400">
                Query: &quot;{submittedQuery}&quot;
              </p>
            )}

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {isSearching && (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading search results
                </div>
              )}

              {!isSearching && error && (
                <div className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/20 dark:text-rose-300">
                  {error}
                </div>
              )}

              {!isSearching && !error && results.length === 0 && (
                <div className="rounded-md border border-dashed border-zinc-300 px-3 py-5 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No results found.
                </div>
              )}

              {!isSearching &&
                !error &&
                results.map((item) => (
                  <div
                    key={item.messageId}
                    className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-[#313338]"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <UserAvatar
                        src={item.memberImageUrl || undefined}
                        className="h-8 w-8 md:h-8 md:w-8"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                          {item.memberName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {item.type === 'channel' && item.channelName && (
                      <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                        # {item.channelName}
                      </p>
                    )}

                    <p className="break-words text-sm text-zinc-700 dark:text-zinc-200">
                      {highlightText(item.content || '(attachment)', submittedQuery)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
