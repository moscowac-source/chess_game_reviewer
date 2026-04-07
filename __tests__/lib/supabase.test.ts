/**
 * @jest-environment node
 */
import { supabase } from "@/lib/supabase";

describe("supabase client", () => {
  it("initializes from env vars without throwing", () => {
    expect(() => supabase).not.toThrow();
    expect(supabase).toBeDefined();
  });
});
