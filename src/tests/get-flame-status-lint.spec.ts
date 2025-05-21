import fs from "fs";
import path from "path";
import { describe, it } from "vitest";

const SRC_DIR = path.resolve(__dirname, "..");

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "tests") return [];
      return walk(res);
    }
    if (res.endsWith(".ts") || res.endsWith(".tsx")) return [res];
    return [];
  });
}

describe("get-flame-status call lint", () => {
  it("uses the getFlameStatus helper instead of direct invoke", () => {
    const files = walk(SRC_DIR);
    const violations: string[] = [];
    const search = "functions.invoke('get-flame-status'";

    for (const file of files) {
      if (file.endsWith("getFlameStatus.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      if (content.includes(search)) {
        violations.push(file);
      }
    }

    if (violations.length) {
      console.error(
        "Direct get-flame-status invocation found:\n" + violations.join("\n"),
      );
      throw new Error(`Found ${violations.length} direct invocation(s).`);
    }
  });
});
