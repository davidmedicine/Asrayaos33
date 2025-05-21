import { supabase } from "@/lib/supabase_client/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface FlameStatus {
  flameStatus: string;
}

export async function getFlameStatus(
  flameSpirit: string,
): Promise<FlameStatus> {
  try {
    const { data, error } = await supabase.functions.invoke<FlameStatus>(
      "get-flame-status",
      { body: { flameSpirit } },
    );

    if (error) throw error;
    return data as FlameStatus;
  } catch (err) {
    if (err instanceof FunctionsHttpError) {
      try {
        const body = await err.context?.response?.text();
        if (body) err.context = { ...(err.context ?? {}), body };
      } catch {
        /* ignore */
      }
    }
    throw err;
  }
}
