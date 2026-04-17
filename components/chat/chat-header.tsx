import { Hash } from 'lucide-react';
import UserAvatar from '../user-avatar';
import { ChatVideoButton } from './chat-video-button';
import { MobileToggle } from '../mobile-toggle';
import { SocketIndicator } from '../socket-indicator';
import { ChatSearch } from './search';

interface ChatHeaderProps {
  serverId: string;
  serverName?: string;
  name: string;
  email?: string;
  type: 'channel' | 'conversation';
  imageUrl?: string;
  searchScope?: {
    serverId?: string;
    channelId?: string;
    conversationId?: string;
  };
}

export const ChatHeader = ({
  serverId,
  serverName,
  name,
  email,
  type,
  imageUrl,
  searchScope,
}: ChatHeaderProps) => {
  return (
    <div className="text-md flex h-12 items-center gap-2 border-b-2 border-neutral-200 px-3 font-semibold dark:border-neutral-800">
      <MobileToggle serverId={serverId} />
      {type === 'channel' && <Hash className="mr-1 h-5 w-5 text-zinc-500 dark:text-zinc-400" />}
      {type === 'conversation' && (
        <UserAvatar src={imageUrl} className="mr-1 h-8 w-8 md:h-8 md:w-8" />
      )}
      <p className="text-md truncate font-semibold text-black dark:text-white">
        {name === 'null null' ? email : name}
      </p>

      <div className="ml-auto flex items-center gap-2">
        <ChatSearch
          type={type}
          name={name}
          email={email}
          serverName={serverName}
          searchScope={searchScope}
        />
        {type === 'conversation' && <ChatVideoButton />}
        <SocketIndicator />
      </div>
    </div>
  );
};
