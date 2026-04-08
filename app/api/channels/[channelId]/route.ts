import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { MemberRole } from '@/generated/prisma/enums';

export async function DELETE(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    if (!profile) return new NextResponse('Unauthorized', { status: 401 });

    const { channelId } = await params;
    if (!channelId) {
      return new NextResponse('Channel ID Required', { status: 400 });
    }

    const serverId = searchParams.get('serverId');
    if (!serverId) {
      return new NextResponse('Server ID Required', { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          delete: {
            id: channelId,
            name: {
              not: 'general',
            },
          },
        },
      },
    });
    return NextResponse.json(server);
  } catch (error) {
    console.log('[CHANNEL DELETE ERROR]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const { name, type } = await req.json();

    const profile = await currentProfile();
    if (!profile) return new NextResponse('Unauthorized', { status: 401 });

    const { channelId } = await params;
    if (!channelId) {
      return new NextResponse('Channel ID Required', { status: 400 });
    }

    const serverId = searchParams.get('serverId');
    if (!serverId) {
      return new NextResponse('Server ID Required', { status: 400 });
    }

    if (name === 'general') {
      return new NextResponse('Cannot edit general channel', { status: 400 });
    }

    const server = await db.server.update({
      where: {
        id: serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR],
            },
          },
        },
      },
      data: {
        channels: {
          update: {
            where: {
              id: channelId,
              name: {
                not: 'general',
              },
            },
            data: {
              name,
              type,
            },
          },
        },
      },
    });
    return NextResponse.json(server);
  } catch (error) {
    console.log('[CHANNEL_EDIT_ERROR]', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
