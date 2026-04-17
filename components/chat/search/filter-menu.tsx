import { ChevronLeft, Hash, Loader2, Search, Trash2, UserRound } from 'lucide-react';

import UserAvatar from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FilterChannel,
  FilterUser,
  formatHistoryLabel,
  SearchHistoryItem,
} from '@/components/chat/search/utils';

type FilterMenuView = 'root' | 'from' | 'in';

type ChatSearchFilterMenuProps = {
  searchValue: string;
  filterMenuView: FilterMenuView;
  isFiltersLoading: boolean;
  filterUsers: FilterUser[];
  filterChannels: FilterChannel[];
  searchHistory: SearchHistoryItem[];
  onBackToRoot: () => void;
  onOpenFrom: () => void;
  onOpenIn: () => void;
  onChooseFromUser: (user: FilterUser) => void;
  onChooseInChannel: (channel: FilterChannel) => void;
  onApplyHistoryItem: (item: SearchHistoryItem) => void;
  onClearHistory: () => void;
};

export const ChatSearchFilterMenu = ({
  searchValue,
  filterMenuView,
  isFiltersLoading,
  filterUsers,
  filterChannels,
  searchHistory,
  onBackToRoot,
  onOpenFrom,
  onOpenIn,
  onChooseFromUser,
  onChooseInChannel,
  onApplyHistoryItem,
  onClearHistory,
}: ChatSearchFilterMenuProps) => {
  return (
    <>
      <div className="border-b border-zinc-200 px-4 py-3 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
        <p className="text-sm">
          Search for <span className="font-semibold">{searchValue.trim() || '...'}</span>
        </p>
      </div>

      {filterMenuView !== 'root' && (
        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onBackToRoot}
            className="h-7 px-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to filters
          </Button>
        </div>
      )}

      {filterMenuView === 'root' && (
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Filters
          </p>
          <Button
            type="button"
            variant="ghost"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOpenFrom}
            className="h-auto w-full items-start justify-start gap-3 px-2 py-2 text-left"
          >
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                From a specific user
              </span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">from: user</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onOpenIn}
            className="mt-1 h-auto w-full items-start justify-start gap-3 px-2 py-2 text-left"
          >
            <Hash className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            <span>
              <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Sent in a specific channel
              </span>
              <span className="block text-sm text-zinc-500 dark:text-zinc-400">in: channel</span>
            </span>
          </Button>

          {searchHistory.length > 0 && (
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  History
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onClearHistory}
                  className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </Button>
              </div>

              <div className="space-y-1">
                {searchHistory.map((item, index) => (
                  <Button
                    key={`${item.query}-${item.fromUser?.profileId || 'none'}-${item.inChannel?.channelId || 'none'}-${index}`}
                    type="button"
                    variant="ghost"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onApplyHistoryItem(item)}
                    className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-200"
                  >
                    <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="truncate">{formatHistoryLabel(item)}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filterMenuView === 'from' && (
        <ScrollArea className="h-72 px-2 py-2">
          {isFiltersLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users...
            </div>
          )}
          {!isFiltersLoading && filterUsers.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No users found.
            </div>
          )}
          {!isFiltersLoading &&
            filterUsers.map((user) => (
              <Button
                key={user.profileId}
                type="button"
                variant="ghost"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChooseFromUser(user)}
                className="h-auto w-full justify-start gap-2 px-3 py-2"
              >
                <UserAvatar src={user.imageUrl || undefined} className="h-6 w-6 md:h-6 md:w-6" />
                <span className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                  {user.name}
                </span>
              </Button>
            ))}
        </ScrollArea>
      )}

      {filterMenuView === 'in' && (
        <ScrollArea className="h-72 px-2 py-2">
          {isFiltersLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading channels...
            </div>
          )}
          {!isFiltersLoading && filterChannels.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No channels found.
            </div>
          )}
          {!isFiltersLoading &&
            filterChannels.map((channel) => (
              <Button
                key={channel.channelId}
                type="button"
                variant="ghost"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChooseInChannel(channel)}
                className="h-auto w-full justify-start gap-2 px-3 py-2"
              >
                <Hash className="h-4 w-4 text-zinc-500" />
                <span className="truncate text-sm text-zinc-800 dark:text-zinc-100">
                  {channel.name}
                </span>
              </Button>
            ))}
        </ScrollArea>
      )}
    </>
  );
};
