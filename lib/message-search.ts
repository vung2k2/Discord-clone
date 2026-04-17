import { elasticsearch, isElasticsearchConfigured } from '@/lib/elasticsearch';

type MessageSearchDocument = {
  messageId: string;
  type: 'channel' | 'conversation';
  serverId: string | null;
  channelId: string | null;
  conversationId: string | null;
  memberId: string;
  profileId: string;
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_INDEX = 'discord_messages';

export const MESSAGE_SEARCH_INDEX = process.env.ELASTICSEARCH_INDEX_MESSAGES || DEFAULT_INDEX;

const ensureIndex = async () => {
  if (!isElasticsearchConfigured || !elasticsearch) {
    return;
  }

  const exists = await elasticsearch.indices.exists({ index: MESSAGE_SEARCH_INDEX });

  if (exists) {
    return;
  }

  await elasticsearch.indices.create({
    index: MESSAGE_SEARCH_INDEX,
    mappings: {
      properties: {
        messageId: { type: 'keyword' },
        type: { type: 'keyword' },
        serverId: { type: 'keyword' },
        channelId: { type: 'keyword' },
        conversationId: { type: 'keyword' },
        memberId: { type: 'keyword' },
        profileId: { type: 'keyword' },
        content: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 },
          },
        },
        fileName: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 },
          },
        },
        fileUrl: { type: 'keyword' },
        deleted: { type: 'boolean' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
  });
};

const upsertDocument = async (doc: MessageSearchDocument) => {
  if (!isElasticsearchConfigured || !elasticsearch) {
    return;
  }

  await ensureIndex();

  await elasticsearch.index({
    index: MESSAGE_SEARCH_INDEX,
    id: doc.messageId,
    document: doc,
    refresh: 'wait_for',
  });
};

export const indexChannelMessage = async (payload: {
  messageId: string;
  serverId: string;
  channelId: string;
  memberId: string;
  profileId: string;
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  await upsertDocument({
    messageId: payload.messageId,
    type: 'channel',
    serverId: payload.serverId,
    channelId: payload.channelId,
    conversationId: null,
    memberId: payload.memberId,
    profileId: payload.profileId,
    content: payload.content,
    fileName: payload.fileName,
    fileUrl: payload.fileUrl,
    deleted: payload.deleted,
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  });
};

export const indexDirectMessage = async (payload: {
  messageId: string;
  conversationId: string;
  memberId: string;
  profileId: string;
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => {
  await upsertDocument({
    messageId: payload.messageId,
    type: 'conversation',
    serverId: null,
    channelId: null,
    conversationId: payload.conversationId,
    memberId: payload.memberId,
    profileId: payload.profileId,
    content: payload.content,
    fileName: payload.fileName,
    fileUrl: payload.fileUrl,
    deleted: payload.deleted,
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  });
};
