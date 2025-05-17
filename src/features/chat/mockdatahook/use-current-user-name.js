import { createClient } from '@/lib/supabase_client/client'
import { useEffect, useState } from 'react'

export const useCurrentUserName = () => {
  const [name, setName] = useState(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      const { data, error } = await createClient().auth.getSession()
      if (error) {
        console.error(error)
      }

      setName(data.session?.user.user_metadata.full_name ?? '?')
    }

    fetchProfileName()
  }, [])

  return name || '?'
}
