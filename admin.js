/***********************
 * SUPABASE SETTINGS
 ***********************/
const SUPABASE_URL = "https://nbnlwkrwbpdsbmstlnho.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibmx3a3J3YnBkc2Jtc3RsbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTc5MzMsImV4cCI6MjA4MjM5MzkzM30.-jfBhunNYNTug_Rcd6tPuxLEvr6MioSDQkzL4vNCDW8";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/***********************
 * DOM
 ***********************/
const loginCard = document.getElementById("loginCard");
const adminCard = document.getElementById("adminCard");
const formCard = document.getElementById("formCard");
const listCard = document.getElementById("listCard");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMsg = document.getElementById("loginMsg");

const roleMsg = document.getElementById("roleMsg");
const whoami = document.getElementById("whoami");

const formTitle = document.getElementById("formTitle");
const fName = document.getElementById("fName");
const fCategory = document.getElementById("fCategory");
const fSubcategory = document.getElementById("fSubcategory");
const fSort = document.getElementById("fSort");
const fMaps = document.getElementById("fMaps");
const fImage = document.getElementById("fImage");
const fDesc = document.getElementById("fDesc");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formMsg = document.getElementById("formMsg");

const placesList = document.getElementById("placesList");
const refreshBtn = document.getElementById("refreshBtn");
const listMsg = document.getElementById("listMsg");

/***********************
 * STATE
 ***********************/
let isEditor = false;
let editingId = null;

/***********************
 * HELPERS
 ***********************/
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function notice(el, text) {
  el.textContent = text;
  show(el);
}

function clearNotice(el) {
  el.textContent = "";
  hide(el);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function resetForm() {
  editingId = null;
  formTitle.textContent = "Add new place";
  cancelEditBtn.classList.add("hidden");

  fName.value = "";
  fCategory.value = "restaurants";
  fSubcategory.value = "";
  fSort.value = "";
  fMaps.value = "";
  fImage.value = "";
  fDesc.value = "";

  clearNotice(formMsg);
}

function getFormPayload() {
  const payload = {
    name: fName.value.trim(),
    category: fCategory.value.trim(),
    subcategory: fSubcategory.value.trim() || null,
    maps_url: fMaps.value.trim(),
    image_url: fImage.value.trim() || null,
    description: fDesc.value.trim() || null,
  };

  const sortVal = fSort.value.trim();
  payload.sort_order = sortVal === "" ? null : Number(sortVal);

  return payload;
}

function validatePayload(p) {
  if (!p.name) return "Name is required.";
  if (!p.category) return "Category is required.";
  if (!p.maps_url) return "Maps URL is required.";
  if (!/^https?:\/\//i.test(p.maps_url)) return "Maps URL should start with http(s)://";
  return null;
}

/***********************
 * PERMISSIONS
 ***********************/
async function checkEditorStatus(user) {
  // If user exists, check if they are in public.editors
  const { data, error } = await sb
    .from("editors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

/***********************
 * AUTH
 ***********************/
async function login() {
  clearNotice(loginMsg);

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    notice(loginMsg, "Please enter email and password.");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    notice(loginMsg, error.message);
    return;
  }

  await onAuthed(data.user);
}

async function logout() {
  await sb.auth.signOut();
  isEditor = false;
  resetForm();
  placesList.innerHTML = "";

  show(loginCard);
  hide(adminCard);
  hide(formCard);
  hide(listCard);

  clearNotice(loginMsg);
}

/***********************
 * CRUD
 ***********************/
async function loadAllPlaces() {
  clearNotice(listMsg);
  placesList.innerHTML = `<div class="muted">Loading…</div>`;

  const { data, error } = await sb
    .from("places")
    .select("id, name, category, subcategory, description, maps_url, image_url, sort_order, created_at")
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    notice(listMsg, "Couldn’t load places.");
    placesList.innerHTML = "";
    return;
  }

  if (!data || data.length === 0) {
    placesList.innerHTML = `<div class="muted">No places yet.</div>`;
    return;
  }

  placesList.innerHTML = data.map(p => `
    <div class="item">
      <div>
        <div class="itemTitle">${escapeHtml(p.name)}</div>
        <div class="itemMeta">
          <b>${escapeHtml(p.category)}</b>
          ${p.subcategory ? ` / ${escapeHtml(p.subcategory)}` : ""}
          ${Number.isFinite(Number(p.sort_order)) ? ` • order ${escapeHtml(p.sort_order)}` : ""}
        </div>
        ${p.description ? `<div class="muted" style="margin-top:6px;">${escapeHtml(p.description)}</div>` : ""}
      </div>

      <div class="itemBtns">
        <button class="btn" type="button" data-edit="${escapeHtml(p.id)}">Edit</button>
        <button class="btn btnDanger" type="button" data-del="${escapeHtml(p.id)}">Delete</button>
      </div>
    </div>
  `).join("");

  // Wire buttons
  placesList.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEdit(btn.getAttribute("data-edit"), data));
  });

  placesList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => deletePlace(btn.getAttribute("data-del")));
  });
}

function startEdit(id, allData) {
  const p = allData.find(x => String(x.id) === String(id));
  if (!p) return;

  editingId = p.id;
  formTitle.textContent = "Edit place";
  cancelEditBtn.classList.remove("hidden");

  fName.value = p.name ?? "";
  fCategory.value = p.category ?? "restaurants";
  fSubcategory.value = p.subcategory ?? "";
  fSort.value = (p.sort_order ?? "") === null ? "" : String(p.sort_order ?? "");
  fMaps.value = p.maps_url ?? "";
  fImage.value = p.image_url ?? "";
  fDesc.value = p.description ?? "";

  clearNotice(formMsg);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function savePlace() {
  clearNotice(formMsg);

  if (!isEditor) {
    notice(formMsg, "You are not approved as an editor.");
    return;
  }

  const payload = getFormPayload();
  const err = validatePayload(payload);
  if (err) {
    notice(formMsg, err);
    return;
  }

  if (editingId) {
    // UPDATE
    const { error } = await sb.from("places").update(payload).eq("id", editingId);
    if (error) {
      console.error(error);
      notice(formMsg, error.message);
      return;
    }
    notice(formMsg, "Saved ✅");
  } else {
    // INSERT
    const { error } = await sb.from("places").insert(payload);
    if (error) {
      console.error(error);
      notice(formMsg, error.message);
      return;
    }
    notice(formMsg, "Added ✅");
  }

  await loadAllPlaces();
  if (!editingId) resetForm();
}

async function deletePlace(id) {
  if (!isEditor) {
    alert("You are not approved as an editor.");
    return;
  }

  const ok = confirm("Delete this place? This cannot be undone.");
  if (!ok) return;

  const { error } = await sb.from("places").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  await loadAllPlaces();
  if (editingId === id) resetForm();
}

/***********************
 * UI STATE ON AUTH
 ***********************/
async function onAuthed(user) {
  // Check editor status
  whoami.textContent = `Signed in as ${user.email}`;
  roleMsg.textContent = "Checking permissions…";

  isEditor = await checkEditorStatus(user);

  if (!isEditor) {
    roleMsg.textContent = "❌ You are logged in, but not approved as an editor. Ask the owner to add you to the editors list.";
    show(adminCard);
    hide(formCard);
    hide(listCard);
  } else {
    roleMsg.textContent = "✅ Editor access granted. You can add/edit/delete places.";
    show(adminCard);
    show(formCard);
    show(listCard);
    resetForm();
    await loadAllPlaces();
  }

  hide(loginCard);
}

/***********************
 * BOOT
 ***********************/
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
saveBtn.addEventListener("click", savePlace);
cancelEditBtn.addEventListener("click", resetForm);
refreshBtn.addEventListener("click", loadAllPlaces);

// Auto restore session
(async function init() {
  const { data } = await sb.auth.getSession();
  const sessionUser = data?.session?.user;
  if (sessionUser) {
    await onAuthed(sessionUser);
  }
})();
