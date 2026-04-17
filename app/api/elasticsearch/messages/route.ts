import { NextResponse } from 'next/server';

import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { elasticsearch, isElasticsearchConfigured } from '@/lib/elasticsearch';
import { MESSAGE_SEARCH_INDEX } from '@/lib/message-search';

type MessageSearchHit = {
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

type MessageSearchResponseItem = MessageSearchHit & {
  memberName: string;
  memberImageUrl: string | null;
  channelName: string | null;
};

type SortBy = 'relevance' | 'newest' | 'oldest';

export async function GET(req: Request) {
  try {
    if (!isElasticsearchConfigured || !elasticsearch) {
      return NextResponse.json(
        { message: 'Elasticsearch is not configured. Set ELASTICSEARCH_NODE.' },
        { status: 503 },
      );
    }

    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q')?.trim();
    const serverId = searchParams.get('serverId');
    const channelId = searchParams.get('channelId');
    const conversationId = searchParams.get('conversationId');
    const fromProfileId = searchParams.get('fromProfileId');
    const inChannelId = searchParams.get('inChannelId');
    const sortByParam = searchParams.get('sortBy');
    const rawLimit = Number(searchParams.get('limit') || '20');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
    const sortBy: SortBy =
      sortByParam === 'newest' || sortByParam === 'oldest' ? sortByParam : 'relevance';

    if (!q && !fromProfileId && !inChannelId) {
      return NextResponse.json({ message: 'Query q is required' }, { status: 400 });
    }

    if (!serverId && !channelId && !conversationId) {
      return NextResponse.json(
        { message: 'Provide one of serverId, channelId, or conversationId' },
        { status: 400 },
      );
    }

    if (serverId) {
      const canReadServer = await db.server.findFirst({
        where: {
          id: serverId,
          members: {
            some: {
              profileId: profile.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!canReadServer) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    if (!serverId && channelId) {
      const canReadChannel = await db.channel.findFirst({
        where: {
          id: channelId,
          server: {
            members: {
              some: {
                profileId: profile.id,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!canReadChannel) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    if (!serverId && conversationId) {
      const canReadConversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ memberOne: { profileId: profile.id } }, { memberTwo: { profileId: profile.id } }],
        },
        select: {
          id: true,
        },
      });

      if (!canReadConversation) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    if (inChannelId) {
      const channelScopeFilter = serverId
        ? {
            id: inChannelId,
            serverId,
          }
        : {
            id: inChannelId,
            server: {
              members: {
                some: {
                  profileId: profile.id,
                },
              },
            },
          };

      const canReadInChannel = await db.channel.findFirst({
        where: channelScopeFilter,
        select: {
          id: true,
        },
      });

      if (!canReadInChannel) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    if (fromProfileId && serverId) {
      const userInServer = await db.member.findFirst({
        where: {
          serverId,
          profileId: fromProfileId,
        },
        select: {
          id: true,
        },
      });

      if (!userInServer) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const filter: Array<Record<string, unknown>> = [{ term: { deleted: false } }];

    if (serverId) {
      filter.push({ term: { type: 'channel' } });
      filter.push({ term: { serverId } });
    } else if (channelId) {
      filter.push({ term: { type: 'channel' } });
      filter.push({ term: { channelId } });
    } else if (conversationId) {
      filter.push({ term: { type: 'conversation' } });
      filter.push({ term: { conversationId } });
    }

    if (fromProfileId) {
      filter.push({ term: { profileId: fromProfileId } });
    }

    if (inChannelId) {
      filter.push({ term: { type: 'channel' } });
      filter.push({ term: { channelId: inChannelId } });
    }

    const normalizedQuery = q?.trim() || '';
    const useMatchAll = normalizedQuery === '*' || normalizedQuery.length === 0;

    const query = useMatchAll
      ? {
          bool: {
            filter,
          },
        }
      : {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        content: {
                          query: normalizedQuery,
                          boost: 12,
                          slop: 0,
                        },
                      },
                    },
                    {
                      multi_match: {
                        query: normalizedQuery,
                        fields: ['content^3', 'fileName^2'],
                        type: 'best_fields',
                        operator: 'and',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            filter,
          },
        };

    const sort =
      sortBy === 'newest'
        ? [{ createdAt: { order: 'desc' as const } }]
        : sortBy === 'oldest'
          ? [{ createdAt: { order: 'asc' as const } }]
          : [{ _score: { order: 'desc' as const } }, { createdAt: { order: 'desc' as const } }];

    const result = await elasticsearch.search<MessageSearchHit>({
      index: MESSAGE_SEARCH_INDEX,
      size: limit,
      track_scores: true,
      query,
      sort,
    });

    const hits = result.hits.hits
      .map((hit) => hit._source)
      .filter((hit): hit is MessageSearchHit => Boolean(hit));

    if (hits.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const memberIds = Array.from(new Set(hits.map((hit) => hit.memberId)));
    const channelIds = Array.from(
      new Set(
        hits.map((hit) => hit.channelId).filter((channel): channel is string => Boolean(channel)),
      ),
    );

    const members = await db.member.findMany({
      where: {
        id: {
          in: memberIds,
        },
      },
      select: {
        id: true,
        profile: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    const channels =
      channelIds.length > 0
        ? await db.channel.findMany({
            where: {
              id: {
                in: channelIds,
              },
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [];

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        {
          name: member.profile.name,
          imageUrl: member.profile.imageUrl,
        },
      ]),
    );

    const channelMap = new Map(channels.map((channel) => [channel.id, channel.name]));

    const items: MessageSearchResponseItem[] = hits.map((hit) => ({
      ...hit,
      memberName: memberMap.get(hit.memberId)?.name || 'Unknown user',
      memberImageUrl: memberMap.get(hit.memberId)?.imageUrl || null,
      channelName: hit.channelId ? channelMap.get(hit.channelId) || null : null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[ELASTICSEARCH_MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
