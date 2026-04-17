import 'dotenv/config';
import { Client } from '@elastic/elasticsearch';
import { PrismaClient } from '../generated/prisma/client';

type ChannelMessageDoc = {
  messageId: string;
  type: 'channel';
  serverId: string | null;
  channelId: string;
  conversationId: null;
  memberId: string;
  profileId: string;
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type DirectMessageDoc = {
  messageId: string;
  type: 'conversation';
  serverId: null;
  channelId: null;
  conversationId: string;
  memberId: string;
  profileId: string;
  content: string;
  fileName: null;
  fileUrl: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type SearchDoc = ChannelMessageDoc | DirectMessageDoc;

const INDEX_NAME = process.env.ELASTICSEARCH_INDEX_MESSAGES || 'discord_messages';
const ELASTIC_NODE = process.env.ELASTICSEARCH_NODE;
const BATCH_SIZE = 500;
const RESET_INDEX = process.argv.includes('--reset');

if (!ELASTIC_NODE) {
  console.error('Missing ELASTICSEARCH_NODE in environment.');
  process.exit(1);
}

const prisma = new PrismaClient();
const es = new Client({ node: ELASTIC_NODE });

const ensureIndex = async () => {
  if (RESET_INDEX) {
    await es.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  }

  const exists = await es.indices.exists({ index: INDEX_NAME });

  if (exists) {
    return;
  }

  await es.indices.create({
    index: INDEX_NAME,
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

const bulkIndex = async (docs: SearchDoc[]) => {
  if (docs.length === 0) {
    return { success: 0, failed: 0 };
  }

  const operations = docs.flatMap((doc) => [
    { index: { _index: INDEX_NAME, _id: doc.messageId } },
    doc,
  ]);

  const result = await es.bulk({
    refresh: false,
    operations,
  });

  let failed = 0;

  if (result.errors && result.items) {
    failed = result.items.filter((item) => {
      const action = item.index || item.create || item.update || item.delete;
      return Boolean(action && action.error);
    }).length;
  }

  return {
    success: docs.length - failed,
    failed,
  };
};

const reindexChannelMessages = async () => {
  let total = 0;
  let success = 0;
  let failed = 0;
  let cursor: string | undefined;

  while (true) {
    const messages = await prisma.message.findMany({
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      orderBy: { id: 'asc' },
      include: {
        member: {
          select: {
            profileId: true,
          },
        },
        channel: {
          select: {
            serverId: true,
          },
        },
      },
    });

    if (messages.length === 0) {
      break;
    }

    const docs: ChannelMessageDoc[] = messages.map((message) => ({
      messageId: message.id,
      type: 'channel',
      serverId: message.channel.serverId,
      channelId: message.channelId,
      conversationId: null,
      memberId: message.memberId,
      profileId: message.member.profileId,
      content: message.content,
      fileName: message.fileName,
      fileUrl: message.fileUrl,
      deleted: message.deleted,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    }));

    const result = await bulkIndex(docs);

    total += docs.length;
    success += result.success;
    failed += result.failed;

    cursor = messages[messages.length - 1].id;
    console.log(`Indexed channel messages: ${total}`);
  }

  return { total, success, failed };
};

const reindexDirectMessages = async () => {
  let total = 0;
  let success = 0;
  let failed = 0;
  let cursor: string | undefined;

  while (true) {
    const messages = await prisma.directMessage.findMany({
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
      orderBy: { id: 'asc' },
      include: {
        member: {
          select: {
            profileId: true,
          },
        },
      },
    });

    if (messages.length === 0) {
      break;
    }

    const docs: DirectMessageDoc[] = messages.map((message) => ({
      messageId: message.id,
      type: 'conversation',
      serverId: null,
      channelId: null,
      conversationId: message.conversationId,
      memberId: message.memberId,
      profileId: message.member.profileId,
      content: message.content,
      fileName: null,
      fileUrl: message.fileUrl,
      deleted: message.deleted,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    }));

    const result = await bulkIndex(docs);

    total += docs.length;
    success += result.success;
    failed += result.failed;

    cursor = messages[messages.length - 1].id;
    console.log(`Indexed direct messages: ${total}`);
  }

  return { total, success, failed };
};

const main = async () => {
  const startedAt = Date.now();

  await ensureIndex();

  const channelStats = await reindexChannelMessages();
  const directStats = await reindexDirectMessages();

  await es.indices.refresh({ index: INDEX_NAME });

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('Reindex completed');
  console.log({
    index: INDEX_NAME,
    elapsedSeconds: elapsed,
    channelMessages: channelStats,
    directMessages: directStats,
    totalIndexed: channelStats.success + directStats.success,
    totalFailed: channelStats.failed + directStats.failed,
  });
};

main()
  .catch((error) => {
    console.error('Reindex failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
