// SkillForge Worker: serves static assets and proxies Gemini calls.
// The API key lives ONLY in the Cloudflare secret GEMINI_API_KEY (never in client code).

const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const endpoint = m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const MAX_SKILLS = 60;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

function cleanSkills(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const s of input) {
    if (typeof s !== "string") continue;
    const c = s.replace(/[^\p{L}\p{N} .+#&/()\-]/gu, "").trim().slice(0, 60);
    if (c && !out.includes(c)) out.push(c);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

function buildPrompt(skills) {
  return `You are an expert career advisor specialising in Data, Analytics, and AI/ML/Generative AI careers (data analysis, BI, data engineering, data science, machine learning, GenAI/LLM applications, MLOps, data governance and responsible AI). A professional currently has these skills: ${skills.join(", ")}.
Infer their current career trajectory within the data and AI field and recommend the highest-ROI skills they should learn next. Technical recommendations must stay within data, analytics and AI/ML/GenAI (not general software or IT infrastructure). Do not recommend skills they already have.
Return ONLY a raw JSON object, with no markdown, no code fences and no extra text, in exactly this shape:
{"inferred_role":"short string e.g. Mid-Level Data Analyst moving toward Analytics Engineering",
"next_technical_skills":[{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""}],
"next_soft_skills":[{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""}]}
Keep each why_learn_it to 1-2 concise sentences.`;
}

async function handleGenerate(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "Server is missing the GEMINI_API_KEY secret." }, 500);

  // Same-origin only: stops other sites from using this endpoint
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Forbidden" }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const skills = cleanSkills(body?.skills);
  if (!skills.length) return json({ error: "Select at least one skill." }, 400);

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(skills) }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
  });

  let res, lastErr = "Request failed";
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(endpoint(model), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: payload
      });
      if (res.ok) break;
      const e = await res.json().catch(() => ({}));
      lastErr = e.error?.message || `Upstream error (${res.status})`;
      if (![429, 500, 503].includes(res.status)) return json({ error: lastErr }, 502); // real error, don't retry
      await new Promise(r => setTimeout(r, 1200));
    }
    if (res.ok) break;
  }
  if (!res.ok) return json({ error: lastErr }, 502);

  try {
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    const out = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!out.inferred_role || !Array.isArray(out.next_technical_skills) || !Array.isArray(out.next_soft_skills))
      throw new Error("bad shape");
    return json(out);
  } catch {
    return json({ error: "Unexpected AI response format. Please try again." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      return handleGenerate(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
