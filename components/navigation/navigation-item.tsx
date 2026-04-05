'use client';

import { useParams, useRouter } from 'next/navigation';
import { ActionTooltip } from '../action-tooltip';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  imageUrl: string;
  name: string;
}

export function NavigationItem({ id, imageUrl, name }: Props) {
  const params = useParams();
  const router = useRouter();

  function onClick() {
    router.push(`/servers/${id}`);
  }

  return (
    <div className="pb-2">
      <ActionTooltip label={name} side="right" align="center">
        <button className="group relative flex items-center hover:cursor-pointer" onClick={onClick}>
          <div
            className={cn(
              'absolute left-0 bg-primary rounded-r-full transition-all w-1',
              params?.serverId !== id && 'group-hover:h-5',
              params?.serverId === id ? 'h-10' : 'h-0',
            )}
          />
          <div
            className={cn(
              'relative group flex mx-3 h-12 w-12 rounded-[24px] group-hover:rounded-[16px] transition-all overflow-hidden',
              params?.serverId !== id && 'bg-primary/10 text-primary rounded-[16px]',
            )}
          >
            <Image fill src={imageUrl} alt="Channel" />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
}
