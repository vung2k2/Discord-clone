import { NextResponse } from 'next/server';

import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

const CONTEXT_MESSAGES = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const targetMessageId = searchParams.get('targetMessageId');
    const channelId = searchParams.get('channelId');

    if (!profile) return new NextResponse('Unauthorized', { status: 401 });
    if (!targetMessageId) return new NextResponse('Target Message ID Missing', { status: 400 });
    if (!channelId) return new NextResponse('Channel ID Missing', { status: 400 });

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

    const targetMessage = await db.message.findUnique({
      where: { id: targetMessageId },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!targetMessage) {
      return new NextResponse('Message Not Found', { status: 404 });
    }

    if (targetMessage.channelId !== channelId) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const olderMessages = await db.message.findMany({
      where: {
        channelId,
        createdAt: {
          lt: targetMessage.createdAt,
        },
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGES,
    });

    const newerMessages = await db.message.findMany({
      where: {
        channelId,
        createdAt: {
          gt: targetMessage.createdAt,
        },
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: CONTEXT_MESSAGES,
    });

    const allMessages = [...newerMessages.reverse(), targetMessage, ...olderMessages];

    let nextCursor = null;
    let prevCursor = null;

    if (olderMessages.length === CONTEXT_MESSAGES) {
      nextCursor = olderMessages[olderMessages.length - 1].id;
    }

    if (newerMessages.length === CONTEXT_MESSAGES && allMessages.length > 0) {
      prevCursor = allMessages[0].id;
    }

    return NextResponse.json({
      items: allMessages,
      nextCursor,
      prevCursor,
      highlightMessageId: targetMessageId,
    });
  } catch (error) {
    console.error('[MESSAGES_JUMP_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
