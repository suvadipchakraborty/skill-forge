const CONFIG = {
  API_KEY: "AQ.Ab8RN6KFGgvEmu3e7cl9Jh0rgOAqJG7rmsuLDzXbD7nxV2PL8A",
  MODEL: "gemini-2.5-flash",
  get ENDPOINT() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent`;
  }
};

const SKILLS = {
  "Languages": ["Python","JavaScript","TypeScript","Java","C#","C++","Go","Rust","Kotlin","Swift","PHP","Ruby","R","Bash"],
  "Frontend & Mobile": ["HTML/CSS","React","Vue","Angular","Next.js","Tailwind","React Native","Flutter","Figma","Accessibility"],
  "Backend & APIs": ["Node.js","Django","Flask","Spring Boot",".NET","FastAPI","REST APIs","GraphQL","Microservices","System Design"],
  "Data & Databases": ["SQL","PostgreSQL","MongoDB","Redis","Excel","Tableau","Power BI","Pandas","Spark","Data Modeling"],
  "AI & ML": ["Machine Learning","Deep Learning","TensorFlow","PyTorch","NLP","Prompt Engineering","LLM Apps","Computer Vision","Statistics"],
  "Cloud & DevOps": ["AWS","Azure","GCP","Docker","Kubernetes","Terraform","CI/CD","Linux","Git","Monitoring"],
  "Security & QA": ["Cybersecurity","Pen Testing","IAM","Unit Testing","Test Automation","Selenium"],
  "Product & Business": ["Product Management","Roadmapping","Market Research","SEO","Digital Marketing","Financial Modeling","UX Research","Data Analysis"],
  "Process & Leadership": ["Agile","Scrum","Kanban","Jira","Project Management","Team Leadership","Mentoring","Stakeholder Management"],
  "Soft Skills": ["Public Speaking","Negotiation","Communication","Critical Thinking","Problem Solving","Time Management","Storytelling","Emotional Intelligence","Adaptability","Conflict Resolution","Creativity","Collaboration"]
};

const $ = id => document.getElementById(id);
const selected = new Set();
let lastResult = null, deferredPrompt = null;

// ---------- Render pills ----------
const catsEl = $("categories");
for (const [cat, list] of Object.entries(SKILLS)) {
  const d = document.createElement("div");
  d.className = "cat";
  d.innerHTML = `<h3>${cat}</h3><div class="rack"></div>`;
  const rack = d.querySelector(".rack");
  list.forEach(s => {
    const b = document.createElement("button");
    b.className = "pill"; b.textContent = s; b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      const on = !selected.has(s);
      on ? selected.add(s) : selected.delete(s);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on);
      updateBtn();
    };
    rack.appendChild(b);
  });
  catsEl.appendChild(d);
}
function updateBtn() {
  $("generateBtn").disabled = selected.size < 1;
  $("count").textContent = selected.size ? `${selected.size} skill${selected.size > 1 ? "s" : ""} selected` : "";
}

// ---------- Tabs ----------
document.querySelectorAll(".nav").forEach(n => n.onclick = () => {
  document.querySelectorAll(".nav").forEach(x => x.classList.toggle("active", x === n));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + n.dataset.tab));
  syncBar(); window.scrollTo({ top: 0 });
});
function syncBar() {
  const onSkills = $("tab-skills").classList.contains("active");
  $("actionBar").classList.toggle("off", !onSkills || !$("picker").offsetParent);
}

// ---------- Gemini ----------
async function generate() {
  const skills = [...selected];
  $("error").classList.add("hidden");
  $("picker").classList.add("hidden"); $("loading").classList.remove("hidden"); syncBar();

  const prompt = `You are an expert career advisor. A professional currently has these skills: ${skills.join(", ")}.
Infer their current career trajectory and recommend the highest-ROI skills they should learn next. Do not recommend skills they already have.
Return ONLY a raw JSON object, with no markdown, no code fences and no extra text, in exactly this shape:
{"inferred_role":"short string e.g. Mid-Level Full Stack Developer",
"next_technical_skills":[{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""}],
"next_soft_skills":[{"skill_name":"","why_learn_it":""},{"skill_name":"","why_learn_it":""}]}
Keep each why_learn_it to 1-2 concise sentences.`;

  try {
    const res = await fetch(CONFIG.ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": CONFIG.API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || `Request failed (${res.status})`);
    }
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!json.inferred_role || !Array.isArray(json.next_technical_skills) || !Array.isArray(json.next_soft_skills)) throw new Error("Unexpected AI response format.");
    lastResult = json; renderResults(json);
  } catch (err) {
    $("loading").classList.add("hidden"); $("picker").classList.remove("hidden");
    $("error").textContent = "⚠️ Couldn't generate your roadmap. " + err.message;
    $("error").classList.remove("hidden");
  }
  syncBar();
}

function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }
function cards(arr, cls) {
  return arr.map((s, i) => `<div class="card ${cls}" style="animation-delay:${i * 0.1}s"><h4>${esc(s.skill_name)}</h4><p>${esc(s.why_learn_it)}</p></div>`).join("");
}
function renderResults(r) {
  $("role").textContent = r.inferred_role;
  $("techCards").innerHTML = cards(r.next_technical_skills, "");
  $("softCards").innerHTML = cards(r.next_soft_skills, "soft");
  $("loading").classList.add("hidden"); $("results").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("generateBtn").onclick = generate;
$("backBtn").onclick = () => {
  $("results").classList.add("hidden"); $("picker").classList.remove("hidden"); syncBar();
};

// ---------- Share ----------
$("shareBtn").onclick = async () => {
  if (!lastResult) return;
  const all = [...lastResult.next_technical_skills, ...lastResult.next_soft_skills].map(s => s.skill_name);
  const text = `SkillForge says I should learn ${all[0]} and ${all[1]} to become a ${lastResult.inferred_role}!`;
  const url = "https://skill-forge.suvadipchakraborty.workers.dev/";
  try {
    if (navigator.share) await navigator.share({ title: "SkillForge", text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); alert("Copied to clipboard!"); }
  } catch (_) { /* user cancelled */ }
};

// ---------- PWA ----------
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; });
window.addEventListener("appinstalled", () => { deferredPrompt = null; showHint("✅ SkillForge installed!"); });
function showHint(t) { $("installHint").textContent = t; $("installHint").classList.remove("hidden"); }
$("installBtn").onclick = async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
  else if (matchMedia("(display-mode: standalone)").matches) showHint("SkillForge is already installed.");
  else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showHint("On iOS: tap the Share icon, then “Add to Home Screen”.");
  else showHint("Use your browser menu and choose “Install app” or “Add to Home screen”.");
};
syncBar(); updateBtn();
