// === File: src/server/actions/chatActions.ts ===
'use server'; // MUST be the very first line

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, type ReadonlyRequestCookies } from 'next/headers';
import type { Database } from '@/types/supabase';
// Corrected import for types, ensuring ChatOrQuest includes Quest details
import type { ChatMessage, ChatOrQuest, Participant, Quest } from '@/types'; // Use central types
import { revalidatePath, revalidateTag } from 'next/cache'; // Include revalidateTag if needed
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Helper Function for Standardized Error Handling ---
// (Keep this helper local or move to a shared utility)
function handleServerError(error: unknown, actionName: string, contextInfo: string = ''): Error {
    const context = contextInfo ? ` (${contextInfo})` : '';
    let originalMessage = 'Unknown error';
    let originalCode = 'UNKNOWN_CODE';
    if (error instanceof Error) {
        originalMessage = error.message;
        const potentialSupabaseError = error as any;
        if (potentialSupabaseError?.code && typeof potentialSupabaseError?.code === 'string') {
            originalCode = potentialSupabaseError.code;
        }
    } else if (typeof error === 'string') {
        originalMessage = error;
    }
    console.error(`SA Error ${actionName}${context}:`, error);
    if (originalCode === '42501') return new Error(`Action failed: Permission denied${context}. Check RLS policies.`);
    return new Error(`Action '${actionName}' failed${context}. Code: ${originalCode}. Reason: ${originalMessage}`);
}


// --- Helper to CREATE Supabase client configured for Server Actions (Uses ANON KEY + Sync Cookies) ---
// Standardized client creation - uses Anon Key, relies on RLS for security.
const createSupabaseClientForAction = (cookieStore: ReadonlyRequestCookies) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use ANON key

    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Server configuration error: Supabase env vars missing.");
    if (!supabaseUrl.startsWith('http')) throw new Error("Server configuration error: Invalid Supabase URL.");

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey, // Use ANON key
        {
            cookies: {
                // Standard synchronous cookie methods
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); }
                    catch (e) { console.warn(`[Supabase SA Client] Cookie set error: ${name}`, e); }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); }
                    catch (e) { console.warn(`[Supabase SA Client] Cookie remove error: ${name}`, e); }
                },
            },
        }
    );
}

// --- Helper to get User ID (Uses getUser) ---
async function getAuthenticatedUserId(supabase: SupabaseClient<Database>): Promise<string> {
    const actionName = 'getAuthenticatedUserId_Chat'; // Distinct name for logging if needed
    try {
        const { data: { user }, error } = await supabase.auth.getUser(); // Use getUser
        if (error) throw error;
        if (!user?.id) throw new Error("User not authenticated");
        return user.id;
    } catch (error) {
        // Use the standardized error handler
        throw handleServerError(error, actionName);
    }
}

// --- Server Action Implementations ---
// NOTE: RLS Policies MUST allow these operations for authenticated users.
// NOTE: VERIFY all table and column names EXACTLY match your DB schema.

export async function loadConversationsAction(): Promise<ChatOrQuest[]> {
    const actionName = 'loadConversationsAction';
    let userId: string | null = null;
    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client

        // Attempt to get user ID for filtering, but don't fail if logged out (RLS handles visibility)
        try {
             const { data: { user } } = await supabase.auth.getUser();
             userId = user?.id || null;
        } catch (authError) { console.warn("Auth Warning during conversation load:", authError); }

        if (!userId) { console.log("No auth user loadConversationsAction."); return []; } // RLS requires auth, return empty

        console.log(`SA: Loading conversations User ${userId}`);

        // TODO: Implement/Verify REAL Supabase DB Query here (table/columns/filters/RLS)
        // RLS should filter conversations based on user_id or participants automatically
        const { data, error } = await supabase
            .from('conversations') // VERIFY table name
            .select('*')
            .order('updated_at', { ascending: false }); // VERIFY column name

        if (error) throw error; // Throw DB/RLS errors

        // Map data to ensure correct types
        const conversations: ChatOrQuest[] = (data || []).map((conv: any) => ({
            // Spread db fields (snake_case)
            ...conv,
            // Explicitly map/parse fields needing transformation
            userId: conv.user_id, // Map user_id to userId
            createdAt: conv.created_at, // Map created_at
            updatedAt: conv.updated_at, // Map updated_at
            agentId: conv.agent_id, // Map agent_id
            agentAvatarUrl: conv.agent_avatar_url, // Map agent_avatar_url
            isGroup: conv.is_group, // Map is_group
            lastMessagePreview: conv.last_message_preview, // Map last_message_preview
            // Parse JSONB fields safely
            participants: typeof conv.participants === 'string' ? JSON.parse(conv.participants) : conv.participants ?? [],
            milestones: typeof conv.milestones === 'string' ? JSON.parse(conv.milestones) : conv.milestones,
            outputs: typeof conv.outputs === 'string' ? JSON.parse(conv.outputs) : conv.outputs,
            metadata: typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata,
            // Map Quest specific fields
            progressPercent: conv.progress_percent, // Map progress_percent
            themeIntent: conv.theme_intent, // Map theme_intent
            evolvabilityScore: conv.evolvability_score, // Map evolvability_score
            a2aTaskId: conv.a2a_task_id, // Map a2a_task_id
        }));

        console.log(`SA: Loaded ${conversations.length} conversations User ${userId}`);
        return conversations;

    } catch (error) {
        throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
    }
}

export async function loadMessagesAction(conversationId: string): Promise<ChatMessage[]> {
    const actionName = 'loadMessagesAction';
    let userId: string = '';
    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client
        userId = await getAuthenticatedUserId(supabase); // Auth required

        console.log(`SA: Loading messages conv ${conversationId} User ${userId}`);
        if (!conversationId || typeof conversationId !== 'string') throw new Error("Invalid conversation ID.");

        // TODO: Implement/Verify REAL Supabase DB Query here (table/columns/filters/RLS)
        // RLS policy on 'messages' should enforce SELECT based on user participation
        const { data, error } = await supabase
            .from('messages') // VERIFY table
            .select('*')
            .eq('conversation_id', conversationId) // VERIFY column
            .order('created_at', { ascending: true }); // VERIFY column

        if (error) throw error;

        // Map data ensuring correct types
        const messages: ChatMessage[] = (data || []).map((msg: any) => ({
            // Spread db fields
            ...msg,
            // Explicit mapping for clarity / type safety
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            senderType: msg.sender_type,
            agentId: msg.agent_id,
            createdAt: msg.created_at,
            // Parse JSONB
            metadata: typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata,
            // Ensure client-side fields are excluded or handled appropriately
            clientGeneratedId: undefined, // Not from DB
            isOptimistic: undefined,    // Not from DB
        }));

        console.log(`SA: Loaded ${messages.length} messages conv ${conversationId}`);
        return messages;

    } catch (error) {
        throw handleServerError(error, actionName, `Conv ${conversationId}, User ${userId || 'UNKNOWN'}`);
    }
}

// Corrected Signature for createConversationAction
interface CreateConversationPayload {
    type: 'chat' | 'quest';
    title?: string;
    participants?: Participant[];
    goal?: string; // Required for quests
    themeIntent?: string;
    agentId?: string;
    agentAvatarUrl?: string;
    // Add other initial fields from ChatOrQuest type as needed
}
export async function createConversationAction(payload: CreateConversationPayload): Promise<ChatOrQuest | null> {
    const actionName = 'createConversationAction';
    let userId: string = '';
    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client
        userId = await getAuthenticatedUserId(supabase);

        console.log(`SA: Creating ${payload.type} conv User ${userId}`);
        if (!payload || !payload.type) throw new Error("Invalid payload.");
        if (payload.type === 'quest' && !payload.goal) throw new Error("Goal required for quest.");

        // Ensure user is participant
        const participantsList = payload.participants ? [...payload.participants] : [];
        if (!participantsList.some(p => p.id === userId && p.type === 'user')) {
            // TODO: Fetch user profile name/avatar if needed for Participant object
            participantsList.unshift({ id: userId, type: 'user', name: 'Me' });
        }
        const isGroup = participantsList.length > 1;

        // TODO: Implement/Verify REAL Supabase DB Query here (map TS fields to DB columns)
        const newConversationData: Database['public']['Tables']['conversations']['Insert'] = {
            user_id: userId, // Map userId
            title: payload.title || `New ${payload.type} - ${new Date().toLocaleTimeString()}`, // Default title
            type: payload.type,
            participants: participantsList, // Already correct format for JSONB
            is_group: isGroup, // Map isGroup
            channel_name: `channel-${payload.type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // Example unique name
            agent_id: payload.agentId, // Map agentId
            agent_avatar_url: payload.agentAvatarUrl, // Map agentAvatarUrl
            // Quest specific fields (map camelCase to snake_case)
            goal: payload.type === 'quest' ? payload.goal : null, // Map goal
            status: payload.type === 'quest' ? 'draft' : null, // Default status
            theme_intent: payload.type === 'quest' ? payload.themeIntent : null, // Map themeIntent
            progress_percent: payload.type === 'quest' ? 0 : null, // Map progressPercent
            // createdAt/updatedAt handled by DB trigger/default
        };

        const { data, error } = await supabase
            .from('conversations') // VERIFY table
            .insert(newConversationData)
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error("Creation failed: No data returned.");

        console.log(`SA: Conversation ${data.id} created User ${userId}`);
        // Map data back to ChatOrQuest type
        const createdConv: ChatOrQuest = {
            // Spread db fields
            ...data,
            // Map fields back to camelCase
            userId: data.user_id,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            agentId: data.agent_id,
            agentAvatarUrl: data.agent_avatar_url,
            isGroup: data.is_group,
            lastMessagePreview: data.last_message_preview,
            channelName: data.channel_name,
            // Parse JSONB
            participants: typeof data.participants === 'string' ? JSON.parse(data.participants) : data.participants ?? [],
            milestones: typeof data.milestones === 'string' ? JSON.parse(data.milestones) : data.milestones,
            outputs: typeof data.outputs === 'string' ? JSON.parse(data.outputs) : data.outputs,
            metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
            // Quest specific
            progressPercent: data.progress_percent,
            themeIntent: data.theme_intent,
            evolvabilityScore: data.evolvability_score,
            a2aTaskId: data.a2a_task_id,
        };
        return createdConv;

    } catch (error) {
        throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
    }
}

// Renamed and Corrected Signature for sendMessageAction
interface SendMessagePayload {
    conversationId: string;
    content: string;
    senderId: string;
    senderType: 'user' | 'agent' | 'system';
    role?: string;
    agentId?: string; // Required if senderType is 'agent'
    metadata?: Record<string, any>;
    clientGeneratedId?: string; // Not saved to DB
}
export async function sendMessageAction(payload: SendMessagePayload): Promise<ChatMessage | null> {
     const actionName = 'sendMessageAction';
     let userId: string | null = null; // User might not be sending
     try {
         const cookieStore = cookies();
         const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client
         // Only authenticate strictly if the user claims to be the sender
         if (payload.senderType === 'user') {
             userId = await getAuthenticatedUserId(supabase);
             if (userId !== payload.senderId) throw new Error("User sender ID mismatch.");
         }

         console.log(`SA: Sending message conv ${payload.conversationId} from ${payload.senderType} ${payload.senderId}`);
         if (!payload.conversationId || !payload.content || !payload.senderId || !payload.senderType) {
              throw new Error("Missing required fields.");
         }

         // TODO: Implement/Verify REAL Supabase DB Query here (UPDATE conversation timestamp)
         // Update the conversation's updated_at first (or rely on trigger if messages update it)
         const { error: updateConvError } = await supabase
             .from('conversations') // VERIFY
             .update({ updated_at: new Date().toISOString() }) // VERIFY
             .eq('id', payload.conversationId); // VERIFY
         if (updateConvError) console.error(`Error updating conv timestamp ${payload.conversationId}:`, updateConvError);

         // Prepare message data (map camelCase to snake_case)
         const newMessageData: Database['public']['Tables']['messages']['Insert'] = {
              conversation_id: payload.conversationId,
              user_id: payload.senderType === 'user' ? userId : null,
              sender_id: payload.senderId,
              sender_type: payload.senderType,
              agent_id: payload.senderType === 'agent' ? payload.agentId : null,
              role: payload.role || (payload.senderType === 'system' ? 'system' : payload.senderType),
              content: payload.content,
              status: 'delivered', // Assume delivered on successful insert
              metadata: payload.metadata || {}, // Ensure metadata is object
              // createdAt handled by DB default
         };

         // TODO: Implement/Verify REAL Supabase DB Query here (INSERT message)
         const { data, error } = await supabase
             .from('messages') // VERIFY
             .insert(newMessageData)
             .select()
             .single();

         if (error) throw error;
         if (!data) throw new Error("Sending failed: No data returned.");

          console.log(`SA: Message ${data.id} sent conv ${payload.conversationId}`);
          // Map result back to ChatMessage type
         const sentMessage: ChatMessage = {
             ...data,
             conversationId: data.conversation_id,
             senderId: data.sender_id,
             senderType: data.sender_type,
             agentId: data.agent_id,
             createdAt: data.created_at,
             metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
         };
         // TODO: Trigger Supabase Realtime explicitly if needed? (postgres_changes should handle it)
         return sentMessage;

     } catch (error) {
         throw handleServerError(error, actionName, `User ${userId || 'AGENT/SYSTEM'}, Conv ${payload.conversationId}`);
     }
}

export async function deleteConversationAction(conversationId: string): Promise<void> {
    const actionName = 'deleteConversationAction';
    let userId: string = '';
    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client
        userId = await getAuthenticatedUserId(supabase); // Auth required

        console.log(`SA: Deleting conv ${conversationId} User ${userId}`);
        if (!conversationId || typeof conversationId !== 'string') throw new Error("Invalid ID.");

        // TODO: Implement/Verify REAL Supabase DB Query here (SELECT ownership check - optional if RLS is perfect)
        // RLS policy should prevent unauthorized deletes, but checking first can give better errors
        const { data: convData, error: fetchError } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', userId).maybeSingle(); // VERIFY
        if (fetchError) throw fetchError;
        if (!convData) throw new Error("Conversation not found or user not authorized.");

        // TODO: Implement/Verify REAL Supabase DB Query here (DELETE conversation)
        // ON DELETE CASCADE constraint should handle messages
        const { error: deleteError } = await supabase.from('conversations').delete().eq('id', conversationId); // VERIFY
        if (deleteError) throw deleteError;
        console.log(`SA: Conversation ${conversationId} deleted User ${userId}`);
        // revalidateTag(`user-${userId}-conversations`); // Example

    } catch (error) {
        throw handleServerError(error, actionName, `Conv ${conversationId}, User ${userId || 'UNKNOWN'}`);
    }
}

// Added Missing Action
export async function updateQuestAction(questId: string, updates: Partial<Quest>): Promise<Quest | null> {
    const actionName = 'updateQuestAction';
    let userId: string = '';
    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore); // Uses Anon Key client
        userId = await getAuthenticatedUserId(supabase); // Auth required

        console.log(`SA: Updating quest ${questId} User ${userId}`);
        if (!questId || !updates || Object.keys(updates).length === 0) throw new Error("Invalid input.");

        // Prepare allowed updates (map camelCase to snake_case)
        const allowedUpdates: Partial<Database['public']['Tables']['conversations']['Update']> = {
            title: updates.title,
            goal: updates.goal,
            intention: updates.intention,
            outcome: updates.outcome,
            status: updates.status,
            progress_percent: updates.progressPercent, // snake_case
            milestones: updates.milestones, // Assume already JSON compatible
            outputs: updates.outputs, // Assume already JSON compatible
            theme_intent: updates.themeIntent, // snake_case
            evolvability_score: updates.evolvabilityScore, // snake_case
            a2a_task_id: updates.a2aTaskId, // snake_case
            last_message_preview: updates.lastMessagePreview, // snake_case
            updated_at: new Date().toISOString(), // Always update timestamp
        };
        // Remove undefined keys
        Object.keys(allowedUpdates).forEach(key => allowedUpdates[key as keyof typeof allowedUpdates] === undefined && delete allowedUpdates[key as keyof typeof allowedUpdates]);
        if (Object.keys(allowedUpdates).length <= 1 && 'updated_at' in allowedUpdates) { console.warn("No valid fields for quest update."); return null; }

        // TODO: Implement/Verify REAL Supabase DB Query here
        // RLS policy must allow UPDATE if auth.uid() = user_id
        const { data, error } = await supabase
            .from('conversations') // VERIFY
            .update(allowedUpdates)
            .eq('id', questId)
            .eq('user_id', userId) // Ensure ownership
            .eq('type', 'quest') // Ensure it's a quest
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error("Quest update failed or quest not found.");

        console.log(`SA: Quest ${questId} updated User ${userId}`);
        // Map data back to Quest type
        const updatedQuest: Quest = {
            // Spread db fields
            ...data,
            // Map fields back to camelCase
            userId: data.user_id, createdAt: data.created_at, updatedAt: data.updated_at,
            agentId: data.agent_id, agentAvatarUrl: data.agent_avatar_url, isGroup: data.is_group,
            lastMessagePreview: data.last_message_preview, channelName: data.channel_name,
            // Parse JSONB
            participants: typeof data.participants === 'string' ? JSON.parse(data.participants) : data.participants ?? [],
            milestones: typeof data.milestones === 'string' ? JSON.parse(data.milestones) : data.milestones,
            outputs: typeof data.outputs === 'string' ? JSON.parse(data.outputs) : data.outputs,
            metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
            // Quest specific
            progressPercent: data.progress_percent, themeIntent: data.theme_intent,
            evolvabilityScore: data.evolvability_score, a2aTaskId: data.a2a_task_id,
        };
        return updatedQuest;

    } catch (error) {
        throw handleServerError(error, actionName, `Quest ${questId}, User ${userId || 'UNKNOWN'}`);
    }
}

// Ensure file ends with a newline