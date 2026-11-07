const SPINNER = ["⣼", "⣹", "⢻", "⠿", "⡟", "⣏", "⣧", "⣶"];
const STATUS_MSGS = [
  "Evaluating user needs",
  "Collecting data",
  "Evaluating results",
  "Compiling recommendations",
  "Finalizing response",
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

let requirements = [];
let constraints = [];
const history = [];
let lastMsg = "";
let firstMsg = "";
let spinnerTimer = null;
let msgTimer = null;

function showSpinner() {
  const chat = document.getElementById("chat-messages");
  const main = document.getElementById("main-content");

  if (main) main.style.display = "none";
  if (chat) {
    chat.style.display = "flex";
    chat.style.justifyContent = "left";
    chat.style.alignItems = "center";
  }

  let frame = 0;
  let msgIdx = 0;

  chat.innerHTML = `
    <div class="spinner-and-message-container">
      <div class="spinner-container" style="font-size: 3em;">${SPINNER[frame]}</div>
      <div class="progress-message-container">
        <p class="progress-message"></p>
      </div>
      <div class="tracking-info" id="tracking-info"></div>
    </div>
  `;

  const spinner = chat.querySelector(".spinner-container");
  const statusMsg = chat.querySelector(".progress-message");
  const tracking = document.getElementById("tracking-info");

  if (requirements.length > 0) {
    const div = document.createElement("div");
    div.className = "requirements-list";
    div.id = "requirements-list";
    div.innerHTML = '<h4>Requirements:</h4><ul id="requirements-items"></ul>';
    tracking.appendChild(div);

    const list = document.getElementById("requirements-items");
    requirements.forEach((req) => {
      const li = document.createElement("li");
      li.textContent = req;
      list.appendChild(li);
    });
  }

  if (constraints.length > 0) {
    const div = document.createElement("div");
    div.className = "constraints-list";
    div.id = "constraints-list";
    div.innerHTML = '<h4>Constraints:</h4><ul id="constraints-items"></ul>';
    tracking.appendChild(div);

    const list = document.getElementById("constraints-items");
    constraints.forEach((con) => {
      const li = document.createElement("li");
      li.textContent = con;
      list.appendChild(li);
    });
  }

  spinnerTimer = setInterval(() => {
    frame = (frame + 1) % SPINNER.length;
    if (spinner) spinner.textContent = SPINNER[frame];
  }, 70);

  function cycleStatus() {
    if (!statusMsg) return;
    statusMsg.classList.remove("slide-up-fade-in");
    void statusMsg.offsetWidth;
    statusMsg.textContent = STATUS_MSGS[msgIdx];
    statusMsg.classList.add("slide-up-fade-in");
    msgIdx = (msgIdx + 1) % STATUS_MSGS.length;
  }

  cycleStatus();
  msgTimer = setInterval(cycleStatus, 2000);
}

function hideSpinner() {
  if (spinnerTimer) clearInterval(spinnerTimer);
  if (msgTimer) clearInterval(msgTimer);
  spinnerTimer = null;
  msgTimer = null;
}

function showError(message) {
  hideSpinner();
  const chat = document.getElementById("chat-messages");
  chat.innerHTML = `<div class="question-container"><p>${esc(message)}</p><button type="button" class="mcq-next-btn" id="retry-btn">Try again</button><button type="button" class="mcq-next-btn" id="restart-btn">Start over</button></div>`;
  chat.querySelector("#retry-btn").addEventListener("click", () => sendMessage(lastMsg));
  chat.querySelector("#restart-btn").addEventListener("click", () => {
    location.href = "/";
  });
}

async function sendMessage(msg) {
  lastMsg = msg;
  if (!firstMsg) firstMsg = msg;
  showSpinner();

  let context = "";
  if (requirements.length > 0) {
    context += "Current Requirements:\n- " + requirements.join("\n- ") + "\n\n";
  }
  if (constraints.length > 0) {
    context += "Current Constraints:\n- " + constraints.join("\n- ") + "\n\n";
  }

  const fullMessage = context + "User message: " + msg;

  try {
    const res = await fetch("/get_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_input: fullMessage, history }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Something went wrong. Try again.");
      return;
    }
    const resp = JSON.parse(data.response);
    history.push({ role: "user", content: msg });
    history.push({ role: "assistant", content: data.response });
    handleResponse(resp, data.response);
  } catch (err) {
    console.error("Error:", err);
    showError("Something went wrong. Try again.");
  }
}

function submitAnswer(e) {
  e.preventDefault();
  const input = document.getElementById("user-input");
  const msg = input.value.trim();

  if (msg) {
    input.value = "";
    sendMessage(msg);
  }
}

function isSimilar(a, b) {
  const normalize = (s) => s.toLowerCase().trim();
  const words = (s) =>
    normalize(s)
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const aWords = words(a);
  const bWords = words(b);

  if (aWords.length === 0 || bWords.length === 0) return false;

  const matches = aWords.filter((w) =>
    bWords.some((bw) => bw.includes(w) || w.includes(bw)),
  ).length;

  return matches / aWords.length > 0.7;
}

function addRequirement(req) {
  const exists = requirements.some(
    (r) =>
      r.toLowerCase().trim() === req.toLowerCase().trim() || isSimilar(r, req),
  );

  if (exists) {
    console.log(`Skipping duplicate: "${req}"`);
    return;
  }

  requirements.push(req);

  const tracking = document.getElementById("tracking-info");
  let section = document.getElementById("requirements-list");

  if (!section && tracking) {
    section = document.createElement("div");
    section.className = "requirements-list";
    section.id = "requirements-list";
    section.innerHTML =
      '<h4>Requirements:</h4><ul id="requirements-items"></ul>';
    tracking.appendChild(section);
  }

  const list = document.getElementById("requirements-items");
  if (list) {
    const li = document.createElement("li");
    li.textContent = req;
    li.classList.add("fade-in-item");
    list.appendChild(li);
  }
}

function addConstraint(con) {
  const exists = constraints.some(
    (c) =>
      c.toLowerCase().trim() === con.toLowerCase().trim() || isSimilar(c, con),
  );

  if (exists) {
    console.log(`Skipping duplicate: "${con}"`);
    return;
  }

  constraints.push(con);

  const tracking = document.getElementById("tracking-info");
  let section = document.getElementById("constraints-list");

  if (!section && tracking) {
    section = document.createElement("div");
    section.className = "constraints-list";
    section.id = "constraints-list";
    section.innerHTML = '<h4>Constraints:</h4><ul id="constraints-items"></ul>';
    tracking.appendChild(section);
  }

  const list = document.getElementById("constraints-items");
  if (list) {
    const li = document.createElement("li");
    li.textContent = con;
    li.classList.add("fade-in-item");
    list.appendChild(li);
  }
}
function handleResponse(resp, raw) {
  (resp.requirements || []).forEach(addRequirement);
  (resp.constraints || []).forEach(addConstraint);

  switch (resp.type) {
    case "question_multiple_choice":
      hideSpinner();
      showMultiChoice(resp);
      break;

    case "question_slider":
      hideSpinner();
      showSlider(resp);
      break;

    case "question_open_ended":
      hideSpinner();
      showOpenEnded(resp);
      break;

    case "recommendations_list":
      hideSpinner();
      showResults(resp);
      break;

    default:
      console.warn("Unknown type:", resp.type, raw);
      showError("The assistant sent an unexpected answer. Try again.");
  }
}

function showMultiChoice(data) {
  const chat = document.getElementById("chat-messages");
  const radioName = `answer_${Date.now()}`;

  let html = `<div class="question-container">`;
  html += `<div class="question-container-questions">`;
  html += `<h2 class="question-title">${esc(data.question)}</h2>`;
  html += `<p class="question-reasoning">${esc(data.reasoning)}</p>`;

  if (data.options && data.options.length > 0) {
    html += `<form class="mcq-form">`;
    data.options.forEach((opt, i) => {
      html += `
        <label class="mcq-option" role="button">
          <input type="radio" name="${radioName}" value="${esc(opt)}" ${i === 0 ? "checked" : ""}>
          <span class="mcq-option-text">${esc(opt)}</span>
        </label>
      `;
    });
    html += `</form></div><button type="button" class="mcq-next-btn">Next</button>`;
  }
  html += `</div>`;
  chat.innerHTML = html;

  const form = chat.querySelector(".mcq-form");
  const btn = chat.querySelector(".mcq-next-btn");
  if (!form || !btn) return;
  btn.addEventListener("click", () => {
    const selected = form.querySelector(`input[name="${radioName}"]:checked`);
    if (selected) sendMessage(selected.value);
  });
}

function showSlider(data) {
  const chat = document.getElementById("chat-messages");

  let html = `<div class="question-container">`;
  html += `<h2 class="slider-question-header">${esc(data.question)}</h2>`;
  html += `<p class="slider-question-reasoning">${esc(data.reasoning)}</p>`;
  html += `
    <form class="slider-form">
      <label>
        <input class="slider-input" type="range" min="${esc(data.min)}" max="${esc(data.max)}" value="${esc(data.min)}">
        <span class="slider-value">${esc(data.min)}</span> / ${esc(data.max)}
      </label>
      <button type="button" class="slider-next-btn">Next</button>
    </form>
  </div>`;
  chat.innerHTML = html;

  const slider = chat.querySelector(".slider-input");
  const value = chat.querySelector(".slider-value");
  const btn = chat.querySelector(".slider-next-btn");

  slider.addEventListener("input", () => {
    value.textContent = slider.value;
  });

  btn.addEventListener("click", () => {
    sendMessage(slider.value);
  });
}

function showOpenEnded(data) {
  const chat = document.getElementById("chat-messages");
  const main = document.getElementById("main-content");
  const header = document.getElementById("header");
  const desc = document.getElementById("description");
  const chatInput = document.getElementById("chat-input-area");
  const userInput = document.getElementById("user-input");

  if (header) {
    header.innerHTML = `<h2 class="open-ended-question-title">${esc(data.question)}</h2>`;
    header.style.display = "block";
  }
  if (desc) {
    desc.innerHTML = `<p class="open-ended-question-reasoning">${esc(data.reasoning)}</p>`;
    desc.style.display = "block";
  }

  chat.style.display = "none";

  if (main) main.style.display = "flex";
  if (chatInput) chatInput.style.display = "flex";
  if (userInput) userInput.placeholder = "Enter your answer here...";
}

// ---- RESULTS ----
const num = (s) => {
  const m = /\$\s*(\d[\d,]*(?:\.\d+)?)/.exec(String(s ?? ""));
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
};
const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const secs = (ms) => (ms / 1000).toFixed(1) + " s";
const GLYPH = { ok: "✓", warn: "!", bad: "✕", unk: "?", est: "~" };
const MET = { yes: "ok", partly: "warn", no: "bad" };
let S = null;

async function lookup(name) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`/get_product?name=${encodeURIComponent(name)}`, {
      signal: ctrl.signal,
    });
    if (res.status === 404) return {};
    if (!res.ok) return { failed: true };
    const p = await res.json();
    return p && (p.title || p.image || p.price) ? { product: p } : {};
  } catch {
    return { failed: true };
  } finally {
    clearTimeout(timer);
  }
}

function linkOf(it) {
  const l = it.product && it.product.link;
  return typeof l === "string" && l.startsWith("https://") ? l : null;
}

function mediaHTML(it) {
  const none = (head, sub) =>
    `<div class="res-media res-none"><p class="res-big">${esc(it.rec.text)}</p><p class="res-sm"><b>${head}</b>${sub}</p></div>`;
  if (it.state === "wait") {
    return `<div class="res-media res-pending"><span class="res-dot"></span><p class="res-m-t">Checking Google Shopping</p><p class="res-m-s">Looking for “${esc(it.rec.text)}”. No image yet.</p><p class="res-m-e" data-el="${it.i}">${secs(performance.now() - S.t0)}</p></div>`;
  }
  if (it.state === "none") {
    return it.failed
      ? none("Lookup failed", "Google Shopping did not answer. The price here is the model’s estimate.")
      : none("No listing found", "Google Shopping returned nothing for this name. The price here is the model’s estimate.");
  }
  if (!it.product.image) return none("No image", "The listing has no picture.");
  return `<div class="res-media${it.fresh ? " res-fresh" : ""}"><img src="${esc(it.product.image)}" alt="${esc(it.product.title)}"></div>`;
}

function matchHTML(it) {
  if (it.state !== "found" || !it.product.title) return "";
  const t = `<span class="res-t">${esc(it.product.title)}</span>`;
  const miss = it.missing.length
    ? ` Missing from title: ${it.missing.map((w) => `“${esc(w)}”`).join(", ")}.`
    : "";
  if (it.level === "ok") return `<p class="res-match res-ok"><span class="res-l">Matched listing</span>${t}</p>`;
  if (it.level === "partial") return `<p class="res-match res-partial"><span class="res-l">Matched listing · check the title</span>${t}${miss}</p>`;
  return `<p class="res-match res-bad"><span class="res-l">May be a different product</span>${t}You asked for ${esc(it.rec.text)}.${miss}</p>`;
}

function priceHTML(it) {
  const est = it.estText ? "~" + esc(it.estText) : "no estimate";
  if (it.state === "found" && it.real != null) {
    const d = it.est == null ? null : it.real - it.est;
    const delta = d == null ? "" : `<span class="res-delta${d > 0 ? " res-up" : ""}">${d === 0 ? "same as estimate" : (d < 0 ? "−" : "+") + money(Math.abs(d)) + " vs estimate"}</span>`;
    const was = it.estText ? `<span class="res-was">was est. <s>${esc(it.estText)}</s></span>` : "";
    const who = it.level === "bad" ? `Price of the listing above, not of ${esc(it.rec.text)}` : "Google Shopping price";
    const r = it.product.rating;
    const rating = r != null ? `★ ${esc(r)}` + (it.product.reviews != null ? ` (${esc(it.product.reviews)} reviews)` : "") : "No rating on listing";
    return `<div class="res-price"><span class="res-now">${esc(it.product.price)}</span>${was}${delta}<p class="res-src">${who} · ${rating} · checked in ${secs(it.ms)}</p></div>`;
  }
  if (it.state === "wait") {
    return `<div class="res-price"><span class="res-now res-est">${est}</span><span class="res-est-l">Estimate</span><p class="res-src">Model estimate, not a real price yet. Checking Google Shopping for <span data-el="${it.i}">${secs(performance.now() - S.t0)}</span></p></div>`;
  }
  const why = it.state === "found" ? "Listing has no price" : it.failed ? "Lookup failed" : "No listing found";
  return `<div class="res-price"><span class="res-now res-est">${est}</span><span class="res-est-l">Estimate only</span><p class="res-src">${why} · searched for ${secs(it.ms)}</p></div>`;
}

function fitRows(it) {
  const rows = [];
  if (S.budget) {
    const t = "Under " + money(S.budget);
    const ref = it.real ?? it.est;
    if (ref == null) {
      rows.push({ k: "unk", t, ev: "No price to check against the limit" });
    } else {
      const d = S.budget - ref;
      const diff = money(Math.abs(d)) + (d >= 0 ? " under" : " over");
      if (it.real != null) {
        const lead = it.level === "bad" ? "Listing price " : "";
        rows.push({ k: d >= 0 ? "ok" : "bad", t, ev: lead + money(it.real) + " · " + diff + " the limit", fresh: true });
      } else if (it.state === "wait") {
        rows.push({ k: "est", t, ev: "Estimate " + money(ref) + " · " + diff + ". Real price pending." });
      } else {
        rows.push({ k: "est", t, ev: "Estimate only: " + money(ref) + " · " + diff + (it.state === "none" ? ". No listing to confirm." : ". The listing has no price."), fresh: true });
      }
    }
  }
  const fits = Array.isArray(it.rec.fits) ? it.rec.fits : [];
  fits.forEach((f) => rows.push({ k: MET[f.met] || "unk", t: f.requirement, ev: f.note }));
  if (!fits.length) {
    const cons = S.constraints.filter((c) => !(S.budget && /\$/.test(c)));
    [...cons, ...S.requirements].forEach((x) => rows.push({ k: "unk", t: x, ev: "Not checked against this product" }));
  }
  return rows;
}

function fitHTML(it) {
  const rows = fitRows(it);
  if (!rows.length) return "";
  return `<h3 class="res-fit-h">Why it fits what you asked</h3><ul class="res-fit">` + rows.map((f) =>
    `<li class="res-${f.k}${f.fresh && it.fresh ? " res-fresh" : ""}"><span class="res-g">${GLYPH[f.k]}</span><div><b>${esc(f.t)}</b>${f.ev ? `<span class="res-ev">${esc(f.ev)}</span>` : ""}</div></li>`).join("") + "</ul>";
}

function paintPick() {
  const it = S.items[S.sel];
  const specs = String(it.rec.specs ?? "").split(/,\s*/).filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join("");
  const link = linkOf(it);
  const href = link || "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(it.rec.text ?? "");
  S.pick.innerHTML =
    `<div class="res-pick-head"><span class="res-tag">${it.i === 0 ? "Top pick" : "Pick " + (it.i + 1)}</span><span class="res-of">${it.i + 1} of ${S.items.length}</span></div>` +
    `<div class="res-pick-body"><div class="res-left">${mediaHTML(it)}<ul class="res-specs">${specs}</ul></div>` +
    `<div class="res-info"><h2 class="res-name">${esc(it.rec.text)}</h2>${matchHTML(it)}${priceHTML(it)}${fitHTML(it)}` +
    `<div class="res-actions"><a class="res-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${link ? "view listing" : "search Google Shopping"}</a></div></div></div>`;
}

function rowHTML(it) {
  let p = `<span class="res-rp res-est">${it.estText ? "~" + esc(it.estText) : "no estimate"}</span>`;
  let s;
  if (it.state === "found") {
    if (it.real != null) p = `<span class="res-rp">${esc(it.product.price)}</span>`;
    s = "<span>listing found ·</span>" + (it.level === "bad" ? '<span class="res-flag">different product?</span>' : it.level === "partial" ? '<span class="res-flag res-soft">check title</span>' : "<span>title matches</span>");
  } else if (it.state === "none") {
    s = `<span>${it.failed ? "lookup failed" : "no listing found"} · estimate only</span>`;
  } else {
    s = `<span>checking Google Shopping · <span data-el="${it.i}">${secs(performance.now() - S.t0)}</span></span>`;
  }
  return `<span class="res-n">${it.i + 1}</span><span class="res-rn">${esc(it.rec.text)}</span>${p}<span class="res-rs">${s}</span><span class="res-rt">${esc(it.rec.specs)}</span>`;
}

function paintRow(it) {
  it.row.hidden = it.i === S.sel;
  it.row.innerHTML = rowHTML(it);
  it.row.classList.toggle("res-fresh", it.fresh);
  it.row.setAttribute("aria-label", "Show " + (it.rec.text ?? "") + " in the main panel");
}

function paintStatus() {
  const n = S.items.length;
  const done = S.items.filter((x) => x.state !== "wait").length;
  const found = S.items.filter((x) => x.state === "found").length;
  S.status.textContent = done < n
    ? "checking Google Shopping · " + secs(performance.now() - S.t0)
    : n + " of " + n + " checked in " + secs(Math.max(...S.items.map((x) => x.ms))) + " · " + found + " listing" + (found === 1 ? "" : "s") + " found · " + (n - found) + " not found";
}

function tick() {
  S.root.querySelectorAll("[data-el]").forEach((el) => {
    if (S.items[el.dataset.el].state === "wait") el.textContent = secs(performance.now() - S.t0);
  });
  paintStatus();
  if (S.items.every((x) => x.state !== "wait")) {
    clearInterval(S.timer);
    S.timer = null;
  }
}

function select(i) {
  S.sel = i;
  S.items.forEach((x) => { x.fresh = false; });
  S.items.forEach(paintRow);
  paintPick();
  document.getElementById("chat-messages").scrollTop = 0;
}

function resolve(i, r) {
  const it = S.items[i];
  const p = r.product;
  it.ms = performance.now() - S.t0;
  it.product = p || null;
  it.state = p ? "found" : "none";
  it.failed = !!r.failed;
  if (p) {
    const m = typeof p.match === "number" ? p.match : 1;
    it.level = m < 0.5 ? "bad" : m < 1 ? "partial" : "ok";
    it.missing = Array.isArray(p.missing) ? p.missing : [];
    it.real = num(p.price);
  }
  it.fresh = true;
  paintRow(it);
  if (S.sel === i) paintPick();
  paintStatus();
  const gen = S;
  setTimeout(() => { if (S === gen) it.fresh = false; }, 1700);
}

function showResults(data) {
  const chat = document.getElementById("chat-messages");
  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
  const reqs = requirements.slice();
  const cons = constraints.slice();

  requirements = [];
  constraints = [];

  if (recs.length === 0) {
    chat.innerHTML = `<div class="question-container"><p>No matching products were found.</p><button type="button" class="mcq-next-btn" id="restart-btn">Start over</button></div>`;
    chat.querySelector("#restart-btn").addEventListener("click", () => {
      location.href = "/";
    });
    return;
  }

  chat.innerHTML = `<div class="res-wrap"><header class="res-top"><div><p class="res-lbl">Results for</p><h1>${esc(firstMsg)}</h1><p class="res-status" role="status"></p></div><a class="res-btn" href="/">start over</a></header><div class="res-deck"><article class="res-pick" aria-live="polite"></article><section><h2 class="res-alts-h">Other picks</h2><div class="res-alts-list"></div></section></div></div>`;

  const root = chat.querySelector(".res-wrap");
  S = {
    root, t0: performance.now(), sel: 0, timer: null, items: [],
    budget: Number(data.budget_max) > 0 ? Number(data.budget_max) : 0,
    requirements: reqs, constraints: cons,
    pick: root.querySelector(".res-pick"), status: root.querySelector(".res-status"),
  };
  const list = root.querySelector(".res-alts-list");
  recs.forEach((rec, i) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "res-row";
    row.addEventListener("click", () => select(i));
    list.appendChild(row);
    S.items.push({
      i, rec, row, state: "wait", failed: false, product: null, level: "ok", missing: [], ms: 0, fresh: false,
      est: num(rec.price), estText: String(rec.price ?? "").replace("Price: ", "").trim(), real: null,
    });
  });
  S.items.forEach(paintRow);
  paintPick();
  paintStatus();
  S.timer = setInterval(tick, 100);
  recs.forEach((rec, i) => lookup(rec.text ?? "").then((r) => resolve(i, r)));
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) submitAnswer(e);
  });

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q");
  if (query) sendMessage(query);
});
