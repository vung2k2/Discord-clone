'use client';
import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { useModal } from '@/hooks/use-modal.store';
import { ActionTooltip } from '../action-tooltip';
import { ChannelType, MemberRole } from '@/generated/prisma/enums';
import { ServerWithMemberAndProfile } from '@/types/server-type';

interface ServerSectionProps {
  label: string;
  role?: MemberRole;
  sectionType: 'channels' | 'members';
  channelType?: ChannelType;
  server?: ServerWithMemberAndProfile;
}

const ServerSection: React.FC<ServerSectionProps> = ({
  label,
  role,
  sectionType,
  channelType,
  server,
}) => {
  const { onOpen } = useModal();
  return (
    <div className="flex items-center justify-between py-2">
      <p className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
      {role !== MemberRole.GUEST && sectionType === 'channels' && (
        <ActionTooltip label="Create Channel" side="top">
          <button
            onClick={() => onOpen('createChannel', { channelType })}
            className="hover:cursor-pointer text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </ActionTooltip>
      )}
      {role === MemberRole.ADMIN && sectionType === 'members' && (
        <ActionTooltip label="Manage Members" side="top">
          <button
            onClick={() => onOpen('members', { server })}
            className="hover:cursor-pointer text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
};

export default ServerSection;
