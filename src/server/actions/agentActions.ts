// === File: src/server/actions/agentActions.ts ===
"use server"; // MUST be the very first line

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, type ReadonlyRequestCookies } from 'next/headers';
import type { Database } from '@/types/supabase'; // Your generated DB types
import type { AgentDefinition } from '@/types/agent'; // Adjust path if needed

// --- Helper to CREATE Supabase client configured for Server Actions ---
const createSupabaseClientForAction = (cookieStore: ReadonlyRequestCookies) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_URL missing.");
    if (!supabaseAnonKey) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
    if (!supabaseUrl.startsWith('http')) throw new Error("Server config error: Invalid Supabase URL.");

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (e) {
                        console.warn(`[Supabase SA Client] Cookie set error: ${name}`, e);
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
                    } catch (e) {
                        console.warn(`[Supabase SA Client] Cookie remove error: ${name}`, e);
                    }
                },
            },
        }
    );
}

// --- Helper to get User ID ---
// Accepts the Supabase client instance
async function getAuthenticatedUserId(supabase: Awaited<ReturnType<typeof createSupabaseClientForAction>>): Promise<string> {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session?.user?.id) throw new Error("User not authenticated");
        return session.user.id;
    } catch (error) {
        throw handleServerError(error, 'getAuthenticatedUserId');
    }
}

// --- Helper for Standardized Error Handling ---
function handleServerError(error: unknown, actionName: string, contextInfo: string = ''): Error {
    const context = contextInfo ? ` (${contextInfo})` : '';
    let originalMessage = 'Unknown error';
    let originalCode = 'UNKNOWN_CODE';

    if (error instanceof Error) {
        originalMessage = error.message;
        if ('code' in error && typeof error.code === 'string') {
            originalCode = error.code;
        }
    } else if (typeof error === 'string') {
        originalMessage = error;
    }

    console.error(`SA Error ${actionName}${context}:`, error);

    // Consider more specific error handling based on originalCode
    const clientError = new Error(
        `Action '${actionName}' failed${context}. Code: ${originalCode}. Reason: ${originalMessage}`
    );
    (clientError as any).code = originalCode; // Attach the code for more specific client-side handling
    return clientError;
}


// --- Server Action Implementations ---
// NOTE:  Ensure RLS Policies are correctly set up in Supabase for these to work with Anon Key client.
// NOTE:  VERIFY all table and column names EXACTLY match your DB schema.


export async function addAgentAction(agent: AgentDefinition): Promise<AgentDefinition | null> {
    const actionName = 'addAgentAction';
    let userId: string; // Declare userId outside the try block

    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore);
        userId = await getAuthenticatedUserId(supabase); // Get user ID

        console.log(`SA: Adding agent for user ${userId}`, agent);

        // TODO: Implement REAL Supabase DB Query here (INSERT into 'agents' table)
        // Ensure RLS allows user to insert (if applicable)
        const { data, error } = await supabase
            .from('agents') // <-- VERIFY TABLE NAME
            .insert({
                user_id: userId, // <-- VERIFY COLUMN NAME
                /* Map AgentDefinition fields to your table columns */
                name: agent.name,
                tone: agent.tone,
                symbol: agent.symbol,
                colorPrimary: agent.colorPrimary,
                colorSecondary: agent.colorSecondary,
                themeClass: agent.themeClass,
                description: agent.description,
                meta_tags: agent.metaTags, // Corrected column name
                model: agent.model,
                supports: agent.supports,
                initial_prompt: agent.initialPrompt,
                voice_id: agent.voiceId,
                avatar_style: agent.avatarStyle,
                orb_config: agent.orbConfig,
                ai_persona_description: agent.aiPersonaDescription,
                onboarding_quote: agent.onboardingQuote,
                agent_mode: agent.agentMode,
            })
            .select()
            .single();

        if (error) throw error; // Throw Supabase error for handling

        console.log(`SA: Agent added with ID ${data?.id} for user ${userId}`);
        return data as AgentDefinition; // Map the Supabase response back to the AgentDefinition type

    } catch (error) {
        throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`); // Use the helper
    }
}


export async function updateAgentAction(agentId: string, updates: Partial<AgentDefinition>): Promise<AgentDefinition | null> {
    const actionName = 'updateAgentAction';
    let userId: string = '';

    try {
        const cookieStore = cookies();
        const supabase = createSupabaseClientForAction(cookieStore);
        userId = await getAuthenticatedUserId(supabase);

        console.log(`SA: Updating agent ${agentId} for user ${userId}`, updates);

        // Prepare the updates object, excluding immutable fields (like id, user_id)
        const allowedUpdates: Partial<Database['public']['Tables']['agents']['Update']> = {
            name: updates.name,
            tone: updates.tone,
            symbol: updates.symbol,
            colorPrimary: updates.colorPrimary,
            colorSecondary: updates.colorSecondary,
            theme_class: updates.themeClass, // Corrected column name
            description: updates.description,
            meta_tags: updates.metaTags,     // Corrected column name
            model: updates.model,
            supports: updates.supports,
            initial_prompt: updates.initialPrompt,
            voice_id: updates.voiceId,
            avatar_style: updates.avatarStyle,
            orb_config: updates.orbConfig,
            ai_persona_description: updates.aiPersonaDescription,
            onboarding_quote: updates.onboardingQuote,
            agent_mode: updates.agentMode
        };

        // Remove undefined keys to prevent them from overwriting with null in DB
        Object.keys(allowedUpdates).forEach(key => allowedUpdates[key as keyof typeof allowedUpdates] === undefined && delete allowedUpdates[key as keyof typeof allowedUpdates]);


        // TODO: Implement REAL Supabase DB Query here (UPDATE agents WHERE id = agentId AND user_id = userId)
        // Ensure RLS allows this update only if the user owns the agent
        const { data, error } = await supabase
            .from('agents') // <-- VERIFY TABLE NAME
            .update(allowedUpdates)
            .eq('id', agentId) // <-- VERIFY COLUMN NAME
            .eq('user_id', userId) // <-- Ensure ownership, RLS must allow this
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error("Agent update failed or agent not found.");

        console.log(`SA: Agent ${agentId} updated successfully User ${userId}`);
        // Map the result back to AgentDefinition type
        return data as AgentDefinition; // Cast or map if necessary

    } catch (error) {
        throw handleServerError(error, actionName, `Agent ${agentId}, User ${userId || 'UNKNOWN'}`);
    }
}

// Ensure file ends with a newline