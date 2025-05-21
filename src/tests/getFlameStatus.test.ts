import { describe, it, expect, vi, afterEach } from "vitest";
import { getFlameStatus } from "@/lib/api/getFlameStatus";
import { supabase } from "@/lib/supabase_client/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

vi.mock("@/lib/supabase_client/client", () => {
  return { supabase: { functions: { invoke: vi.fn() } } };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getFlameStatus", () => {
  it("should return 200 with valid body", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { flameStatus: "blazing" },
      error: null,
    });
    const result = await getFlameStatus("ember");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("get-flame-status", {
      body: { flameSpirit: "ember" },
    });
    expect(result).toEqual({ flameStatus: "blazing" });
  });

  it("should return 400 if flameSpirit missing", async () => {
    const err = new FunctionsHttpError("Missing flameSpirit", 400) as any;
    err.context = {
      response: {
        text: () => Promise.resolve('{"error":"Missing flameSpirit"}'),
      },
    };
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: err,
    });

    await expect(getFlameStatus("")).rejects.toBe(err);
    expect(err.context.body).toBe('{"error":"Missing flameSpirit"}');
  });
});
