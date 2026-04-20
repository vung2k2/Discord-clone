import ServerSideBar from '@/components/server/server-sidebar';
import { ServerSearchStateProvider } from '@/components/provider/server-search-state-provider';
import { currentProfile } from '@/lib/current-profile';
import { findServer } from '@/lib/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  params: Promise<{ serverId: string }>;
}

export default async function ServerIdLayout({ children, params }: Props) {
  const { serverId } = await params;
  const { redirectToSignIn } = await auth();
  const profile = await currentProfile();

  if (!profile) {
    return redirectToSignIn();
  }

  const server = await findServer(serverId, profile?.id);

  if (!server) {
    return redirect('/');
  }

  return (
    <ServerSearchStateProvider>
      <div className="h-full">
        <div className="hidden md:flex! h-full w-60 z-20 flex-col fixed inset-y-0">
          <ServerSideBar serverId={server.id} />
        </div>
        <main className="h-full md:pl-60">{children}</main>
      </div>
    </ServerSearchStateProvider>
  );
}
