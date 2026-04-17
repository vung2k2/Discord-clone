import { NextApiRequest } from 'next';

import { db } from '@/lib/db';
import { currentProfilePages } from '@/lib/current-profile-page';
import { indexDirectMessage } from '@/lib/message-search';
import { NextApiResponseServerIO } from '@/types/server-type';

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const profile = await currentProfilePages(req);
    const { content, fileUrl } = req.body;
    const { conversationId } = req.query;

    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    if (!conversationId) return res.status(400).json({ error: 'Conversation ID Missing' });

    if (!content) return res.status(400).json({ error: 'Content Missing' });

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
        OR: [{ memberOne: { profileId: profile.id } }, { memberTwo: { profileId: profile.id } }],
      },
      include: {
        memberOne: {
          include: { profile: true },
        },
        memberTwo: {
          include: { profile: true },
        },
      },
    });

    if (!conversation) return res.status(404).json({ error: 'Connversation not found' });

    const member =
      conversation.memberOne.profileId === profile.id
        ? conversation.memberOne
        : conversation.memberTwo;

    if (!member) return res.status(404).json({ message: 'Member not found' });

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        conversationId: conversationId as string,
        memberId: member.id,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    try {
      await indexDirectMessage({
        messageId: message.id,
        conversationId: conversation.id,
        memberId: message.memberId,
        profileId: message.member.profileId,
        content: message.content,
        fileName: null,
        fileUrl: message.fileUrl,
        deleted: message.deleted,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });
    } catch (indexError) {
      console.error('[DIRECT_MESSAGE_INDEX_ERROR]', indexError);
    }

    const channelKey = `chat:${conversationId}:messages`;

    res?.socket?.server?.io?.emit(channelKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.error('[DIRECT_MESSAGES_POST]', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
