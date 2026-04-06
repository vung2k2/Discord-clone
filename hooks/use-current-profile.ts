import { auth } from '@clerk/nextjs/server';
import { getCurrentProfile } from '../lib/profiles/actions';

export async function useCurrentProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return profile;
}
