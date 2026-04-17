import { NextResponse } from 'next/server';

import { ChannelType } from '@/generated/prisma/enums';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json({ message: 'serverId is required' }, { status: 400 });
    }

    const server = await db.server.findFirst({
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

    if (!server) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const [members, channels] = await Promise.all([
      db.member.findMany({
        where: {
          serverId,
        },
        select: {
          profileId: true,
          profile: {
            select: {
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      db.channel.findMany({
        where: {
          serverId,
          type: ChannelType.TEXT,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return NextResponse.json({
      users: members.map((member) => ({
        profileId: member.profileId,
        name: member.profile.name,
        imageUrl: member.profile.imageUrl,
      })),
      channels: channels.map((channel) => ({
        channelId: channel.id,
        name: channel.name,
      })),
    });
  } catch (error) {
    console.error('[ELASTICSEARCH_FILTERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
