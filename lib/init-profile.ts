import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from './db';

export const initProfile = async () => {
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
      image: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress || '',
    },
  });

  return newProfile;
};
