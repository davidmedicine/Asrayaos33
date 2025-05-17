// === File: src/server/actions/layoutActions.ts ===
// v1.111 - Implements async createSupabaseClientForAction based on specific feedback.

'use server'; // MUST be the very first line

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // Import the cookies function
import type { Database } from '@/types/supabase';
import type { ContextLayoutState, PinnedItem } from '@/types/layout';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Helper Function for Standardized Error Handling ---
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

    console.error(`SA Error ${actionName}${context}:`, error); // Log detailed error

    if (originalCode === '42501') return new Error(`Action failed: Permission denied${context}. Check RLS policies.`);
    // Add other specific error code checks if needed

    return new Error(`Action '${actionName}' failed${context}. Code: ${originalCode}. Reason: ${originalMessage}`);
}

// --- Helper to CREATE Supabase client configured for Server Actions ---
// CORRECTED: Now async, awaits cookies() *before* creating the client instance.
// Uses Anon Key as requested.
const createSupabaseClientForAction = async (): Promise<SupabaseClient<Database>> => {
    // Await cookies() *before* creating the client instance, as per feedback.
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use ANON key

    // Environment variable validation
    if (!supabaseUrl) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_URL missing.");
    if (!supabaseAnonKey) throw new Error("Server config error: NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
    if (!supabaseUrl.startsWith('http')) throw new Error("Server config error: Invalid Supabase URL format.");

    // Create client using Anonymous Key
    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey, // Use ANON key
        {
            cookies: {
                // --- Keep these methods SYNCHRONOUS ---
                // They operate on the `cookieStore` instance already resolved above.
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); }
                    catch (e) { console.warn(`[Supabase SA Client] Cookie set error: ${name}`, e); } // Changed logging level
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options, maxAge: 0 }); }
                    catch (e) { console.warn(`[Supabase SA Client] Cookie remove error: ${name}`, e); } // Changed logging level
                },
            },
        }
    );
};


// --- Helper to get User ID (Using getUser) ---
// Accepts the Supabase client instance
async function getAuthenticatedUserId(supabase: SupabaseClient<Database>): Promise<string> {
    const actionName = 'getAuthenticatedUserId';
    try {
        const { data: { user }, error } = await supabase.auth.getUser(); // Use getUser
        if (error) throw error; // Throw Supabase specific error
        if (!user?.id) throw new Error("User not authenticated");
        return user.id;
    } catch (error) {
        throw handleServerError(error, actionName);
    }
}

// --- Server Action Implementations ---
// NOTE: RLS Policies MUST allow these operations for authenticated users.
// NOTE: VERIFY all table and column names EXACTLY match your DB schema.

export async function saveContextLayoutAction(
    contextKey: string,
    layoutState: ContextLayoutState
): Promise<void> {
    const actionName = 'saveContextLayoutAction';
    let userIdForContext: string = 'UNKNOWN_USER';
    try {
        // Await the ASYNC client creation helper
        const supabase = await createSupabaseClientForAction();
        const userId = await getAuthenticatedUserId(supabase);
        userIdForContext = userId;

        console.log(`SA: Saving layout user ${userId}, context ${contextKey}`);
        if (!contextKey || typeof contextKey !== 'string' || !layoutState || typeof layoutState !== 'object') {
            throw new Error("Invalid input provided.");
        }

        // RLS must allow INSERT/UPDATE for user_id = auth.uid()
        // TODO: Implement/Verify REAL Supabase DB Query here
        const { error } = await supabase
            .from('user_layout_state') // VERIFY table name
            .upsert({
                user_id: userId,           // VERIFY column name
                context_key: contextKey,   // VERIFY column name
                layout_state: layoutState, // Ensure column type is jsonb/json
                updated_at: new Date().toISOString(), // VERIFY column name
            }, { onConflict: 'user_id, context_key' }); // VERIFY constraint columns

        if (error) throw error; // This will likely be the RLS error if policies are wrong
        console.log(`SA: Layout saved ${contextKey}`);
        // revalidatePath(...);

    } catch (error) {
        throw handleServerError(error, actionName, `User ${userIdForContext}, Ctx ${contextKey}`);
    }
}

export async function loadLayoutStateAction(): Promise<{ pinnedItems: PinnedItem[], contextLayouts: Record<string, ContextLayoutState> }> {
    const actionName = 'loadLayoutStateAction';
    let userId: string | null = null;
    try {
        // Await the ASYNC client creation helper
        const supabase = await createSupabaseClientForAction();

        // Use getUser for auth check
        try {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
        } catch (authError) { console.warn("Auth Warning during layout load check:", authError); }

        if (!userId) { console.log("No auth user loadLayoutStateAction."); return { pinnedItems: [], contextLayouts: {} }; }

        console.log(`SA: Loading layout state User ${userId}`);

        // TODO: Implement/Verify REAL Supabase DB Queries here
        // RLS must allow SELECT for user_id = auth.uid()
        const [pinnedResult, layoutResult] = await Promise.all([
            supabase.from('pinned_items').select('*').eq('user_id', userId).order('order', { ascending: true }), // VERIFY names
            supabase.from('user_layout_state').select('context_key, layout_state').eq('user_id', userId) // VERIFY names
        ]);

        const { data: pinnedData, error: pinError } = pinnedResult;
        const { data: layoutData, error: layoutError } = layoutResult;

        // Log potential RLS/DB errors but continue processing
        if (pinError) console.error(`DB Pin fetch error User ${userId}:`, pinError);
        if (layoutError) console.error(`DB Layout fetch error User ${userId}:`, layoutError);

        // Safely process layouts with Array.isArray check
        const contextLayouts = Array.isArray(layoutData)
            ? layoutData.reduce((acc, row) => {
                if (row.context_key && row.layout_state != null) {
                    try { acc[row.context_key] = typeof row.layout_state === 'string' ? JSON.parse(row.layout_state) : row.layout_state; }
                    catch (e) { console.error(`Failed parse layout_state ctx ${row.context_key}, User ${userId}`, e); }
                } return acc;
            }, {} as Record<string, ContextLayoutState>)
            : {};

        // Safely process pins with Array.isArray check and map snake_case
        const pinnedItems: PinnedItem[] = Array.isArray(pinnedData)
            ? pinnedData.map((item) => ({
                 id: item.id,
                 type: item.type,                   // VERIFY column name in DB
                 itemId: item.item_id,              // VERIFY column name in DB
                 label: item.label,                 // VERIFY column name in DB
                 iconName: item.icon_name,          // VERIFY column name in DB
                 order: item.order,                 // VERIFY column name in DB
                 contextValue: item.context_value,  // VERIFY column name in DB
                 createdAt: item.created_at,        // VERIFY column name in DB
            }))
            : [];

        console.log(`SA: Loaded ${pinnedItems.length} pins, ${Object.keys(contextLayouts).length} layouts User ${userId}`);
        return { pinnedItems, contextLayouts };

    } catch (error) { // Catch critical errors during setup or Promise.all
        throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
    }
}


// --- Other actions using the same updated pattern ---

export async function savePinnedItemAction(item: PinnedItem): Promise<PinnedItem> {
     const actionName = 'savePinnedItemAction';
     let userId: string = '';
     try {
         const supabase = await createSupabaseClientForAction(); // Await async helper
         userId = await getAuthenticatedUserId(supabase); // getUser
         console.log(`SA: Saving pin User ${userId}`);
         // Add input validation...
         if (!item || !item.type || !item.itemId || !item.label) throw new Error("Invalid pin data.");

         // TODO: Implement/Verify REAL Supabase DB Query (get next order)
         // RLS must allow SELECT for auth.uid() = user_id
         const { data: maxOrderData, error: maxOrderError } = await supabase.from('pinned_items').select('order').eq('user_id', userId).order('order', { ascending: false }).limit(1).maybeSingle(); // VERIFY
         if (maxOrderError) throw maxOrderError;
         const nextOrder = (maxOrderData?.order ?? -1) + 1;

         // TODO: Implement/Verify REAL Supabase DB Query (insert)
         // RLS must allow INSERT WITH CHECK (auth.uid() = user_id)
         const { data, error } = await supabase.from('pinned_items').insert({
            user_id: userId,                // VERIFY column
            type: item.type,                 // VERIFY column
            item_id: item.itemId,            // VERIFY column
            label: item.label,               // VERIFY column
            icon_name: item.iconName,        // VERIFY column
            order: nextOrder,                // VERIFY column
            context_value: item.contextValue // VERIFY column
         }).select().single(); // VERIFY table
         if (error) throw error; if (!data) throw new Error("Save failed.");

         console.log(`SA: Pin saved ${data.id} User ${userId}`);
         revalidateTag(`user-${userId}-pins`); // Revalidate cache

         // Map snake_case DB response back to camelCase PinnedItem type
         return {
             id: data.id,
             type: data.type,
             itemId: data.item_id,
             label: data.label,
             iconName: data.icon_name,
             order: data.order,
             contextValue: data.context_value,
             createdAt: data.created_at
         }; // VERIFY fields/columns
     } catch(error) {
         throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
     }
}

export async function removePinnedItemAction(id: string): Promise<void> {
    const actionName = 'removePinnedItemAction';
    let userId: string = '';
    try {
        const supabase = await createSupabaseClientForAction(); // Await async helper
        userId = await getAuthenticatedUserId(supabase); // getUser
        console.log(`SA: Removing pin ${id} User ${userId}`);
        if (!id || typeof id !== 'string') throw new Error("Invalid ID.");

        // TODO: Implement/Verify REAL Supabase DB Query
        // RLS must allow DELETE USING (auth.uid() = user_id)
        const { error } = await supabase.from('pinned_items').delete().eq('id', id).eq('user_id', userId); // VERIFY table/columns
        if (error) throw error; // This will likely be RLS error if policy is wrong
        console.log(`Pin ${id} removed User ${userId}`);
        revalidateTag(`user-${userId}-pins`); // Revalidate cache
    } catch(error) {
        throw handleServerError(error, actionName, `ID ${id}, User ${userId || 'UNKNOWN'}`);
    }
}

export async function updatePinOrderAction(orderedIds: string[]): Promise<void> {
     const actionName = 'updatePinOrderAction';
     let userId: string = '';
     try {
         const supabase = await createSupabaseClientForAction(); // Await async helper
         userId = await getAuthenticatedUserId(supabase); // getUser
         console.log(`SA: Updating pin order User ${userId}`);
         // TODO: Add more validation?
         if (!Array.isArray(orderedIds) || !orderedIds.every(id => typeof id === 'string')) throw new Error("Invalid IDs.");
         if (orderedIds.length === 0) return;

         // TODO: Implement/Verify REAL Supabase DB Query
         // RLS must allow UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
         const updates = orderedIds.map((id, index) => ({ id: id, order: index })); // VERIFY 'order' column name
         // Upsert based on 'id', RLS should protect other users' items
         const { error } = await supabase.from('pinned_items').upsert(updates); // VERIFY table name
         if (error) throw error; // RLS error likely here if policy is wrong
         console.log(`Pin order updated User ${userId}`);
         revalidateTag(`user-${userId}-pins`); // Revalidate cache
     } catch (error) {
         throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
     }
}

export async function resetLayoutAction(): Promise<void> {
    const actionName = 'resetLayoutAction';
    let userId: string = '';
     try {
         const supabase = await createSupabaseClientForAction(); // Await async helper
         userId = await getAuthenticatedUserId(supabase); // getUser
         console.log(`SA: Resetting layout User ${userId}`);

         // TODO: Implement/Verify REAL Supabase DB Queries
         // RLS must allow DELETE USING (auth.uid() = user_id)
         const [layoutResult, pinResult] = await Promise.all([
             supabase.from('user_layout_state').delete().eq('user_id', userId), // VERIFY table/column
             supabase.from('pinned_items').delete().eq('user_id', userId) // VERIFY table/column
         ]);
         if (layoutResult.error) console.error("Error deleting layout states:", layoutResult.error);
         if (pinResult.error) console.error("Error deleting pinned items:", pinResult.error);

         if (layoutResult.error || pinResult.error) console.warn("Partial layout reset.");
         else console.log(`Layout reset complete User ${userId}`);
         // Revalidate relevant data
         revalidatePath('/app', 'layout');
         revalidateTag(`user-${userId}-pins`);

     } catch(error) {
         throw handleServerError(error, actionName, `User ${userId || 'UNKNOWN'}`);
     }
}

// Ensure file ends with a newline