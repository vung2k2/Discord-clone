'use client';

import { useUser } from '@clerk/nextjs';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
}

export function MediaRoom({ chatId, video, audio }: MediaRoomProps) {
  const { user } = useUser();
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const identity = user.id;
    const displayName = user.firstName ?? user.username ?? user.id;

    (async () => {
      try {
        const query = new URLSearchParams({
          room: chatId,
          identity,
          name: displayName,
        });
        const response = await fetch(`/api/livekit?${query.toString()}`);

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error ?? 'Failed to create LiveKit token');
        }

        const data = await response.json();

        if (typeof data.token !== 'string') {
          throw new Error('Invalid LiveKit token payload');
        }

        setToken(data.token);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [user?.id, user?.firstName, user?.username, chatId]);

  if (token === '')
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );

  return (
    <LiveKitRoom
      video={video}
      audio={audio}
      token={token}
      connect={true}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
