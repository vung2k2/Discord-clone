export type FilterUser = {
  profileId: string;
  name: string;
  imageUrl: string | null;
};

export type FilterChannel = {
  channelId: string;
  name: string;
};

export type SortBy = 'relevance' | 'newest' | 'oldest';

export type SearchScope = {
  serverId?: string;
  channelId?: string;
  conversationId?: string;
};

export type SearchHistoryItem = {
  query: string;
  fromUser: FilterUser | null;
  inChannel: FilterChannel | null;
};

export const SEARCH_HISTORY_MAX = 5;

export const stripFilterTokens = (value: string) =>
  value
    .replace(/\bfrom:[^\s]+/gi, '')
    .replace(/\bin:[^\s]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const toTokenValue = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '_');

export const buildSearchInput = (
  text: string,
  fromUser: FilterUser | null,
  inChannel: FilterChannel | null,
) => {
  const tokens = [
    fromUser ? `from:${toTokenValue(fromUser.name)}` : null,
    inChannel ? `in:${toTokenValue(inChannel.name)}` : null,
  ].filter((token): token is string => Boolean(token));

  const normalizedText = text.trim();

  return [...tokens, normalizedText].filter(Boolean).join(' ').trim();
};

export const withTrailingSpace = (value: string) => {
  const normalized = value.trim();

  if (!normalized) {
    return '';
  }

  return `${normalized} `;
};

export const formatHistoryLabel = (item: SearchHistoryItem) => {
  const parts = [
    item.fromUser ? `from:${item.fromUser.name}` : null,
    item.inChannel ? `in:#${item.inChannel.name}` : null,
    item.query || null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ');
};

export const createSearchParams = (args: {
  query: string;
  scope?: SearchScope;
  fromUser: FilterUser | null;
  inChannel: FilterChannel | null;
  sortBy: SortBy;
}) => {
  const params = new URLSearchParams();

  if (args.query) {
    params.set('q', args.query);
  }

  if (args.scope?.serverId) {
    params.set('serverId', args.scope.serverId);
  }

  if (!args.scope?.serverId && args.scope?.channelId) {
    params.set('channelId', args.scope.channelId);
  }

  if (!args.scope?.serverId && args.scope?.conversationId) {
    params.set('conversationId', args.scope.conversationId);
  }

  if (args.fromUser) {
    params.set('fromProfileId', args.fromUser.profileId);
  }

  if (args.inChannel) {
    params.set('inChannelId', args.inChannel.channelId);
  }

  params.set('sortBy', args.sortBy);

  return params;
};
