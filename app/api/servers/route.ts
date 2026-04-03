import { currentProfile } from '@/lib/current_profile';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { name, imageUrl } = await req.json();
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Create the server in the database
    const server = await db.server.create({
      data: {
        name,
        image: imageUrl,
        profileId: profile.id,
        inviteCode: uuidv4(),
        channels: {
          create: { name: 'general', profileId: profile.id },
        },
        members: {
          create: { profileId: profile.id, role: 'ADMIN' },
        },
      },
    });

    return NextResponse.json(server);
  } catch (error) {
    console.error('[SERVER_POST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
