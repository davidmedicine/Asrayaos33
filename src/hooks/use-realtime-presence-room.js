'use client';
import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { createClient } from '@/lib/supabase_client/client'
import { useEffect, useState } from 'react'

const supabase = createClient()

export const useRealtimePresenceRoom = (roomName) => {
  const currentUserImage = useCurrentUserImage()
  const currentUserName = useCurrentUserName()

  const [users, setUsers] = useState({})

  useEffect(() => {
    const room = supabase.channel(roomName)

    room
      .on('presence', { event: 'sync' }, () => {
        const newState = room.presenceState()

        const newUsers = Object.fromEntries(Object.entries(newState).map(([key, values]) => [
          key,
          { name: values[0].name, image: values[0].image },
        ]))
        setUsers(newUsers)
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') {
          return
        }

        await room.track({
          name: currentUserName,
          image: currentUserImage,
        })
      })

    return () => {
      room.unsubscribe()
    };
  }, [roomName, currentUserName, currentUserImage])

  return { users }
}
