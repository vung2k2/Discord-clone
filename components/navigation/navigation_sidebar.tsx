import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { NavigationAction } from './navigation_action';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { NavigationItem } from './navigation-item';
import { ModeToggle } from '../mode-toggle';
import { UserButton } from '@clerk/nextjs';

const NavigationSidebar = async () => {
  const profile = await currentProfile();

  if (!profile) {
    redirect('/');
  }

  const servers = await db.server.findMany({
    where: {
      members: {
        some: { profileId: profile.id },
      },
    },
  });

  return (
    <div className="space-y-4 flex flex-col items-center h-full py-3 text-primary w-full dark:bg-[#1E1F22]">
      <NavigationAction />
      <Separator className="h-0.5 bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {servers.map((server) => (
          <NavigationItem
            key={server.id}
            id={server.id}
            name={server.name}
            imageUrl={server.imageUrl}
          />
        ))}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'h-[48px] w-[48px]' } }} />
      </div>
    </div>
  );
};

export default NavigationSidebar;
