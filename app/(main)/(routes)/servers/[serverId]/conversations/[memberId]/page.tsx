import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { getOrCreateConversation } from '@/lib/conversation';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { MediaRoom } from '@/components/media-room';
import { auth } from '@clerk/nextjs/server';

interface MemberIdPageProps {
  params: Promise<{
    memberId: string;
    serverId: string;
  }>;
  searchParams: Promise<{
    video?: boolean;
  }>;
}

export default async function MemberIdPage({ params, searchParams }: MemberIdPageProps) {
  const { redirectToSignIn } = await auth();
  const { video } = await searchParams;
  const profile = await currentProfile();
  if (!profile) return redirectToSignIn();

  const { memberId, serverId } = await params;
  const currentMember = await db.member.findFirst({
    where: {
      serverId,
      profileId: profile.id,
    },
    include: {
      profile: true,
    },
  });

  if (!currentMember) return redirect('/');

  const server = await db.server.findUnique({
    where: {
      id: serverId,
    },
    select: {
      name: true,
    },
  });

  if (!server) return redirect('/');

  const conversation = await getOrCreateConversation(currentMember.id, memberId);

  if (!conversation) return redirect(`/servers/${serverId}`);

  const { memberOne, memberTwo } = conversation;

  const otherMember = memberOne.profileId === profile.id ? memberTwo : memberOne;

  return (
    <div className="bg-white dark:bg-[#313338] flex h-full flex-col">
      <ChatHeader
        imageUrl={otherMember.profile.imageUrl || undefined}
        name={otherMember.profile.name}
        serverName={server.name}
        serverId={serverId}
        type="conversation"
        searchScope={{ serverId }}
      />
      {video && <MediaRoom chatId={conversation.id} video audio />}
      {!video && (
        <div className="flex min-h-0 flex-1 flex-col transition-[padding] duration-200 sm:pr-(--chat-search-panel-width)">
          <ChatMessages
            member={currentMember}
            name={otherMember.profile.name}
            chatId={conversation.id}
            type="conversation"
            apiUrl="/api/direct-messages"
            paramKey="conversationId"
            paramValue={conversation.id}
            socketUrl="/api/socket/direct-messages"
            socketQuery={{
              conversationId: conversation.id,
            }}
          />
          <ChatInput
            name={otherMember.profile.name}
            type="conversation"
            apiUrl="/api/socket/direct-messages"
            query={{
              conversationId: conversation.id,
            }}
            currentMember={currentMember}
          />
        </div>
      )}
    </div>
  );
}
