import { useCurrentProfile as currentProfile } from '@/hooks/use-current-profile';
import { getServer } from '@/lib/servers/actions';
import { redirect } from 'next/navigation';
import { ServerHeader } from './server-header';
import { ChannelType, MemberRole } from '@/generated/prisma/enums';

interface Props {
  serverId: string;
}

export async function ServerSidebar({ serverId }: Props) {
  const profile = await currentProfile();

  const server = await getServer(serverId);

  if (!server) {
    return redirect('/');
  }

  const textChannels = server.channels.filter((channel) => channel.type === ChannelType.TEXT);
  const audioChannels = server.channels.filter((channel) => channel.type === ChannelType.AUDIO);
  const videoChannels = server.channels.filter((channel) => channel.type === ChannelType.VIDEO);
  const members = server.members.filter((member) => member.profileId !== profile.id);

  const currentMember = server.members.find((member) => member.profileId === profile.id);
  if (!currentMember) {
    return redirect('/');
  }

  const role: MemberRole = currentMember.role;

  return (
    <div className="flex flex-col h-full text-primary w-full dark:bg-[#2b2d31] bg-[#f2f3f5]">
      <ServerHeader server={server} role={role} />
    </div>
  );
}
