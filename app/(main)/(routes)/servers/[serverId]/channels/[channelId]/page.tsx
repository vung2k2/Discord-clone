import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/current-profile';
import { auth } from '@clerk/nextjs/server';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChannelType } from '@/generated/prisma/enums';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatMessages } from '@/components/chat/chat-messages';
import { MediaRoom } from '@/components/media-room';

interface PageProps {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>;
  searchParams: Promise<{
    messageId?: string;
  }>;
}

const Page = async ({ params, searchParams }: PageProps) => {
  const { redirectToSignIn } = await auth();
  const { serverId, channelId } = await params;
  const { messageId } = await searchParams;

  const profile = await currentProfile();
  if (!profile) return redirectToSignIn();

  if (!serverId || !channelId) {
    redirect('/');
  }

  const channel = await db.channel.findUnique({
    where: {
      id: channelId,
    },
    include: {
      server: {
        select: {
          name: true,
        },
      },
    },
  });
  const member = await db.member.findFirst({
    where: {
      serverId,
      profileId: profile.id,
    },
    include: {
      profile: true,
    },
  });
  if (!channel || !member) {
    redirect('/');
  }
  return (
    <div className="bg-white dark:bg-[#313338] flex h-full flex-col">
      <ChatHeader
        name={channel.name}
        serverName={channel.server.name}
        serverId={channel.serverId}
        type="channel"
        searchScope={{ serverId: channel.serverId }}
      />
      {channel.type === ChannelType.TEXT && (
        <div className="flex min-h-0 flex-1 flex-col transition-[padding] duration-200 sm:pr-(--chat-search-panel-width)">
          <ChatMessages
            member={member}
            name={channel.name}
            type="channel"
            apiUrl="/api/messages"
            socketUrl="/api/socket/messages"
            socketQuery={{
              channelId: channel.id,
              serverId: channel.serverId,
            }}
            paramKey="channelId"
            chatId={channel.id}
            paramValue={channel.id}
            messageId={messageId}
          />
          <ChatInput
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{ serverId: channel.serverId, channelId: channel.id }}
            currentMember={member}
          />
        </div>
      )}
      {channel.type === ChannelType.AUDIO && (
        <MediaRoom chatId={channel.id} video={false} audio={true} />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom chatId={channel.id} video={true} audio={true} />
      )}
    </div>
  );
};

export default Page;
