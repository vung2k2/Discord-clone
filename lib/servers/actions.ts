import { db } from '../db';
import { Server } from '@/generated/prisma/browser';

export async function getAllUserServers(profileId: string): Promise<Server[]> {
  return await db.server.findMany({
    where: {
      profileId,
    },
  });
}

export async function getFirstServerByProfileId(profileId: string) {
  return await db.server.findFirst({
    where: {
      members: {
        some: {
          profileId,
        },
      },
    },
  });
}

export async function findServer(serverId: string, profileId: string) {
  return await db.server.findUnique({
    where: {
      id: serverId,
      members: {
        some: {
          profileId: profileId,
        },
      },
    },
  });
}

export async function getServer(serverId: string) {
  return await db.server.findUnique({
    where: {
      id: serverId,
    },
    include: {
      channels: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      members: {
        include: {
          profile: true,
        },
        orderBy: {
          role: 'asc',
        },
      },
    },
  });
}
