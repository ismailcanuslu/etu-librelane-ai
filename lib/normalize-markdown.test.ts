/**
 * Run: npx tsx lib/normalize-markdown.test.ts
 */
import { normalizeMarkdownDisplay } from "./normalize-markdown";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const out = normalizeMarkdownDisplay("Giris\n## Baslik\n- madde");
assert(out.includes("\n\n## Baslik"), "header spacing");
assert(out.includes("\n\n- madde"), "list spacing");

console.log("normalize-markdown.test.ts OK");
