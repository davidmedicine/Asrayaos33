// === File: src/hooks/useConversationMessages.ts ===
// Description: Hook for fetching, subscribing to, and sending messages.
// Added check for supabase client availability in profile fetch effect.

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase_client/client'; // Uses the shared client
import { v4 as uuidv4 } from 'uuid';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types (assuming these are correct)
type MessageStatus = 'sending' | 'sent' | 'failed';
type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'ERROR' | 'CLOSED' | null;

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface OptimisticMessageType {
  id: string;
  conversation_id: string;
  user_id?: string;
  agent_id?: string;
  sender_type: 'user' | 'agent' | 'system';
  content: string;
  created_at: string;
  status: MessageStatus;
  isOptimistic?: boolean;
  clientGeneratedId?: string;
  profile?: UserProfile | null;
}

export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<OptimisticMessageType[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize client using the shared factory function
  // This *should* get the client initialized with env vars based on client.ts logs
  const supabase = createClient();

  // Effect 1: Fetch current user's profile
  useEffect(() => {
    let isMounted = true;
    const fetchUserProfile = async () => {
      // --- ADDED CHECK ---
      console.log('[useConversationMessages] Running fetchUserProfile effect.');
      if (!supabase) {
          console.error('[useConversationMessages] Supabase client object is NOT available here! Cannot fetch profile.');
          setError('Supabase client failed to initialize.'); // Set error state
          if (isMounted) setCurrentUserProfile(null);
          return;
      }
      console.log('[useConversationMessages] Supabase client seems available for profile fetch.');
      // --- END ADDED CHECK ---

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const userId = session?.user?.id;

        if (!userId) {
          if (isMounted) setCurrentUserProfile(null);
          return;
        }

        console.log('[useConversationMessages] Fetching profile for user:', userId); // Log before fetch
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle non-existent profile gracefully (returns null instead of error)

        // Log the result of the profile fetch
        if (profileError) {
            console.error('[useConversationMessages] Supabase profile fetch error:', profileError);
             // Don't throw, just set profile to null and maybe set error state
             if (isMounted) {
                 setCurrentUserProfile(null);
                 setError(`Failed to fetch user profile: ${profileError.message}`);
             }
        } else {
            console.log('[useConversationMessages] Profile data fetched:', profileData);
            if (isMounted) {
                setCurrentUserProfile(profileData as UserProfile | null);
                 // Clear potential previous fetch error if successful now
                 // setError(null); // Optional: depends if you want other errors cleared
            }
        }
      } catch (err: any) {
        console.error('[useConversationMessages] Error in fetchUserProfile logic:', err);
        if (isMounted) {
            setCurrentUserProfile(null);
            setError(err.message || 'An unexpected error occurred fetching the profile.');
        }
      }
    };

    fetchUserProfile();
    return () => { isMounted = false; };
  // Depend only on supabase instance (which depends on env vars implicitly)
  // If supabase instance itself could change (e.g., context), add it here.
  }, [supabase]);

  // Effect 2: Fetch initial messages (Looks OK, no changes needed for API key issue)
  useEffect(() => {
    if (!conversationId) { /* ... */ return; }
    setIsLoadingInitial(true); setError(null); setMessages([]);
    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select(`*, profile:profiles (id, full_name, avatar_url)`)
          .eq('conversation_id', conversationId)
          .order('created_at');
        if (fetchError) throw fetchError;
        const transformedMessages: OptimisticMessageType[] = data.map(msg => ({
          ...msg, profile: msg.profile as UserProfile | null, status: 'sent', isOptimistic: false,
        }));
        setMessages(transformedMessages);
      } catch (err: any) { /* ... */ }
      finally { setIsLoadingInitial(false); }
    };
    fetchMessages();
  }, [conversationId, supabase]);

  // Effect 3: Subscribe to realtime (Looks OK, no changes needed for API key issue)
  useEffect(() => {
    if (!conversationId || !supabase) { /* ... cleanup ... */ return; }
    const channelTopic = `messages-${conversationId}`;
    if (channelRef.current?.topic === `realtime:${channelTopic}`) { return; }
    if (channelRef.current) { supabase.removeChannel(channelRef.current).catch(/* ... */); }
    const newChannel = supabase.channel(channelTopic)
      .on<OptimisticMessageType>( 'postgres_changes', { /* ... filter ... */ }, (payload) => { /* ... handler ... */ } )
      .subscribe((status, err) => { /* ... handler ... */ });
    channelRef.current = newChannel;
    return () => { /* ... cleanup ... */ };
  }, [conversationId, supabase, currentUserProfile]); // Keep currentUserProfile if needed inside handler

  // Function to send message (Looks OK, no changes needed for API key issue)
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    /* ... checks ... */
    if (!currentUserProfile) { /* ... error handling ... */ return false; }
    const userId = currentUserProfile.id;
    /* ... optimistic update ... */
    try {
      const { error: insertError } = await supabase
        .from('messages').insert({ /* ... data ... */ }).select('id').single();
      if (insertError) throw insertError;
      return true;
    } catch (err: any) { /* ... error handling ... */ return false; }
    finally { setIsSendingMessage(false); }
  }, [conversationId, supabase, currentUserProfile]);

  return { messages, sendMessage, isLoadingInitial, realtimeStatus, error, isSendingMessage, currentUserProfile };
}