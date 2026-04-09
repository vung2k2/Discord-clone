import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/current-profile';
import { auth } from '@clerk/nextjs/server';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChannelType } from '@/generated/prisma/enums';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatMessages } from '@/components/chat/chat-messages';

interface PageProps {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { redirectToSignIn } = await auth();
  const { serverId, channelId } = await params;

  const profile = await currentProfile();
  if (!profile) return redirectToSignIn();

  if (!serverId || !channelId) {
    redirect('/');
  }

  const channel = await db.channel.findUnique({
    where: {
      id: channelId,
    },
  });
  const member = await db.member.findFirst({
    where: {
      serverId,
      profileId: profile.id,
    },
  });
  if (!channel || !member) {
    redirect('/');
  }
  return (
    <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
      <ChatHeader name={channel.name} serverId={channel.serverId} type="channel" />
      {channel.type === ChannelType.TEXT && (
        <>
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
          />
          <ChatInput
            name={channel.name}
            type="channel"
            apiUrl="/api/socket/messages"
            query={{ serverId: channel.serverId, channelId: channel.id }}
          />
        </>
      )}
      {/* {channel.type === ChannelType.AUDIO && (
        <MediaRoom chatId={channel.id} video={false} audio={true} />
      )}
      {channel.type === ChannelType.VIDEO && (
        <MediaRoom chatId={channel.id} video={true} audio={true} />
      )} */}
    </div>
  );
};

export default Page;
