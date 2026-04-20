import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { DirectMessage } from '@/generated/prisma/client';

const MESSAGES_BATCH = 20;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get('cursor');
    const conversationId = searchParams.get('conversationId');
    const direction = searchParams.get('direction') === 'newer' ? 'newer' : 'older';

    if (!profile) return new NextResponse('Unauthorized', { status: 401 });

    if (!conversationId) return new NextResponse('Conversation ID Missing', { status: 400 });

    let messages: DirectMessage[] = [];

    if (cursor && direction === 'newer') {
      const cursorMessage = await db.directMessage.findFirst({
        where: {
          id: cursor,
          conversationId,
        },
        select: {
          createdAt: true,
        },
      });

      if (!cursorMessage) {
        return new NextResponse('Cursor Message Not Found', { status: 404 });
      }

      messages = await db.directMessage.findMany({
        take: MESSAGES_BATCH,
        where: {
          conversationId,
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
      messages = await db.directMessage.findMany({
        take: MESSAGES_BATCH,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          conversationId,
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
      messages = await db.directMessage.findMany({
        take: MESSAGES_BATCH,
        where: { conversationId },
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
    console.error('[DIRECT_MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
