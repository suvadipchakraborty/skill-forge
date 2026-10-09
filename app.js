const SKILLS = {
  "Programming & Query": ["Python","SQL","R","Scala","Julia","Bash","Git","Jupyter Notebooks"],
  "Data Engineering": ["ETL/ELT","Data Pipelines","Apache Spark","PySpark","Airflow","dbt","Kafka","Databricks","Delta Lake","Streaming Data"],
  "Databases & Warehousing": ["PostgreSQL","MySQL","SQL Server","MongoDB","Snowflake","BigQuery","Redshift","Data Modeling","Dimensional Modeling","Data Lakehouse"],
  "Analytics & BI": ["Excel","Power BI","Tableau","Looker","Qlik","Data Visualization","Dashboard Design","Descriptive Analytics","Cohort Analysis","KPI Design"],
  "Statistics & Experimentation": ["Statistics","Probability","Hypothesis Testing","Regression","A/B Testing","Time Series","Forecasting","Causal Inference","Bayesian Methods","EDA","Pandas","NumPy"],
  "Machine Learning": ["Supervised Learning","Unsupervised Learning","Scikit-learn","XGBoost","Feature Engineering","Model Evaluation","Deep Learning","TensorFlow","PyTorch","NLP","Computer Vision","Recommender Systems","Anomaly Detection"],
  "Generative AI & LLMs": ["Prompt Engineering","LLM Apps","RAG","Embeddings","Vector Databases","Fine-Tuning","LangChain","LlamaIndex","AI Agents","Hugging Face","LLM Evaluation","Gemini / OpenAI / Claude APIs"],
  "MLOps & Cloud": ["MLOps","MLflow","Model Deployment","Docker","AWS","Azure","GCP","CI/CD for ML","Feature Stores","Model Monitoring"],
  "Governance & Responsible AI": ["Data Governance","Data Quality","Data Lineage","Metadata Management","Master Data Management","Data Privacy","Responsible AI","Model Risk Management","Explainable AI (SHAP)","AI Ethics"],
  "Business & Domain": ["Business Analysis","Data Storytelling","Product Analytics","Financial Modeling","Requirements Gathering","Data Strategy","Market Research","Domain Knowledge"],
  "Delivery & Leadership": ["Agile","Scrum","Jira","Project Management","Team Leadership","Mentoring","Stakeholder Management","Change Management"],
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

// ---------- AI (via /api/generate Worker; API key is a Cloudflare secret) ----------
async function generate() {
  const skills = [...selected];
  $("error").classList.add("hidden");
  $("picker").classList.add("hidden"); $("loading").classList.remove("hidden"); syncBar();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
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
