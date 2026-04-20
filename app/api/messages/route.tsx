import { NextResponse } from 'next/server';

import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { Message } from '@/generated/prisma/client';

const MESSAGES_BATCH = 20;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get('cursor');
    const channelId = searchParams.get('channelId');
    const direction = searchParams.get('direction') === 'newer' ? 'newer' : 'older';

    if (!profile) return new NextResponse('Unauthorized', { status: 401 });

    if (!channelId) return new NextResponse('Channel ID Missing', { status: 400 });

    let messages: Message[] = [];

    if (cursor && direction === 'newer') {
      const cursorMessage = await db.message.findFirst({
        where: {
          id: cursor,
          channelId,
        },
        select: {
          createdAt: true,
        },
      });

      if (!cursorMessage) {
        return new NextResponse('Cursor Message Not Found', { status: 404 });
      }

      messages = await db.message.findMany({
        take: MESSAGES_BATCH,
        where: {
          channelId,
          createdAt: {
            gt: cursorMessage.createdAt,
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
      });

      messages = messages.reverse();
    } else if (cursor) {
      messages = await db.message.findMany({
        take: MESSAGES_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          channelId,
        },
        include: {
          member: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      messages = await db.message.findMany({
        take: MESSAGES_BATCH,
        where: { channelId },
        include: {
          member: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    let nextCursor = null;
    let prevCursor = null;

    if (direction === 'older' && messages.length === MESSAGES_BATCH) {
      nextCursor = messages[MESSAGES_BATCH - 1].id;
    }

    if (direction === 'newer' && messages.length === MESSAGES_BATCH) {
      prevCursor = messages[0].id;
    }

    return NextResponse.json({ items: messages, nextCursor, prevCursor });
  } catch (error) {
    console.error('[MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
