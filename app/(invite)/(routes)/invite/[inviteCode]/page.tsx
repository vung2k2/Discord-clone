import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { auth } from '@clerk/nextjs/server';

interface InviteCodePageProps {
  params: Promise<{
    inviteCode: string;
  }>;
}

const InviteCodePage = async ({ params }: InviteCodePageProps) => {
  const { redirectToSignIn } = await auth();
  const { inviteCode } = await params;

  const profile = await currentProfile();

  if (!profile) {
    return redirectToSignIn();
  }

  if (!inviteCode) {
    return redirect('/');
  }

  const existingServer = await db.server.findFirst({
    where: {
      inviteCode,
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
  });

  if (existingServer) {
    return redirect(`/servers/${existingServer.id}`);
  }

  const server = await db.server.update({
    where: {
      inviteCode,
    },
    data: {
      members: {
        create: [
          {
            profileId: profile.id,
          },
        ],
      },
    },
  });

  if (server) {
    return redirect(`/servers/${server.id}`);
  }

  return null;
};

export default InviteCodePage;
