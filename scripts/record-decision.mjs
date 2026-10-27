// Parses the JSON block from a [jig] issue, validates it, writes decisions/<issue>.json
// and rebuilds decisions.json (the file the jig reads back).
// Identity and time come from GitHub (issue author, created_at), not from the issue body.
import fs from "node:fs";
import path from "node:path";

const env = process.env;
const out = (k, v) => fs.appendFileSync(env.GITHUB_OUTPUT, `${k}<<EOF_${k}\n${v}\nEOF_${k}\n`);
const fail = msg => { out("status", "error"); out("message", `Could not record this decision.\n\n${msg}\n\nEdit the issue to fix it and the Action runs again.`); process.exit(0); };

const JIGS = { "telemetry-sankey": { tokens: ["brand", "secondary", "neutral"] } };
const ROLES = ["operator", "admin", "developer", "compliance", "designer", "pm"];
const OPACITY_KEYS = ["linkOpacity", "hoverOpacity", "dimOpacity"];

const m = (env.ISSUE_BODY || "").match(/```json\s*([\s\S]*?)```/);
if (!m) fail("No ```json block found in the issue body.");
let d;
try { d = JSON.parse(m[1]); } catch (e) { fail(`The JSON block does not parse: ${e.message}`); }

const errs = [];
const jig = JIGS[d.jig];
if (d.schema !== 1) errs.push("schema must be 1");
if (!jig) errs.push(`unknown jig "${d.jig}"`);
if (typeof d.jigVersion !== "string" || !d.jigVersion) errs.push("jigVersion missing");
if (!ROLES.includes(d.role)) errs.push(`role must be one of ${ROLES.join(", ")}`);
if (typeof d.rationale !== "string" || d.rationale.trim().length < 10) errs.push("rationale must be at least 10 characters");
if (typeof d.rationale === "string" && d.rationale.length > 500) errs.push("rationale must be under 500 characters");
const v = d.values || {};
const c = v.colour || {};
if (!/^#[0-9a-f]{6}$/i.test(c.hex || "")) errs.push("colour.hex must be #rrggbb");
if (c.mode === "preset" && !(jig?.tokens || []).includes(c.token)) errs.push("colour.token must be a known palette token");
if (c.mode === "custom" && c.token !== null) errs.push("custom colour must have token null");
if (!["preset", "custom"].includes(c.mode)) errs.push("colour.mode must be preset or custom");
for (const k of OPACITY_KEYS) if (typeof v[k] !== "number" || v[k] < 0 || v[k] > 1) errs.push(`${k} must be a number from 0 to 1`);
if (errs.length) fail(errs.map(e => `- ${e}`).join("\n"));

const record = {
  login: env.ISSUE_LOGIN,
  issue: Number(env.ISSUE_NUMBER),
  issueUrl: env.ISSUE_URL,
  recordedAt: env.ISSUE_CREATED,
  repoSha: env.JIG_SHA,
  jig: d.jig,
  jigVersion: d.jigVersion,
  role: d.role,
  values: {
    colour: { mode: c.mode, token: c.mode === "preset" ? c.token : null, hex: c.hex.toLowerCase() },
    linkOpacity: v.linkOpacity, hoverOpacity: v.hoverOpacity, dimOpacity: v.dimOpacity
  },
  rationale: d.rationale.trim(),
  sawOthers: d.sawOthers === true
};

fs.mkdirSync("decisions", { recursive: true });
fs.writeFileSync(path.join("decisions", `${record.issue}.json`), JSON.stringify(record, null, 2) + "\n");

// One file per issue: editing an issue replaces its record, and git history keeps the earlier version.
// Every issue counts, so one person can record several decisions.
const records = fs.readdirSync("decisions").filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join("decisions", f), "utf8")))
  .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
fs.writeFileSync("decisions.json", JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2) + "\n");

out("status", "ok");
out("message", [
  `Recorded for **${record.login}** (${record.role}) against jig version \`${record.jigVersion}\`.`,
  "",
  `Colour \`${record.values.colour.token || record.values.colour.hex}\`, link ${record.values.linkOpacity}, hovered ${record.values.hoverOpacity}, others ${record.values.dimOpacity}.`
].join("\n"));
