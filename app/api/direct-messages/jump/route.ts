import { NextResponse } from 'next/server';

import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

const CONTEXT_MESSAGES = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const targetMessageId = searchParams.get('targetMessageId');
    const conversationId = searchParams.get('conversationId');

    if (!profile) return new NextResponse('Unauthorized', { status: 401 });
    if (!targetMessageId) return new NextResponse('Target Message ID Missing', { status: 400 });
    if (!conversationId) return new NextResponse('Conversation ID Missing', { status: 400 });

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

    const targetMessage = await db.directMessage.findUnique({
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

    if (targetMessage.conversationId !== conversationId) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const olderMessages = await db.directMessage.findMany({
      where: {
        conversationId,
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

    const newerMessages = await db.directMessage.findMany({
      where: {
        conversationId,
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
    console.error('[DIRECT_MESSAGES_JUMP_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
