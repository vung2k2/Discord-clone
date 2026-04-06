import { auth, currentUser } from '@clerk/nextjs/server';
import type { Profile } from '@/generated/prisma/client';
import { db } from '@/lib/db';

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const profile = await db.profile.findUnique({
    where: {
      userId: user.id,
    },
  });

  return profile;
}

export async function getOrCreateUserProfile() {
  const user = await currentUser();
  const { redirectToSignIn } = await auth();

  if (!user) {
    return redirectToSignIn();
  }

  const profile = await db.profile.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (profile) {
    return profile;
  }

  const newProfile = await db.profile.create({
    data: {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress || '',
    },
  });

  return newProfile;
}
