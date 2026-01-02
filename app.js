/***********************
 * 1) SUPABASE SETTINGS
 ***********************/
const SUPABASE_URL = "https://nbnlwkrwbpdsbmstlnho.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibmx3a3J3YnBkc2Jtc3RsbmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MTc5MzMsImV4cCI6MjA4MjM5MzkzM30.-jfBhunNYNTug_Rcd6tPuxLEvr6MioSDQkzL4vNCDW8";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// If your images are in /images/, set this to "images/"
// If they are next to the html files, leave as ""
const IMAGE_BASE_PATH = ""; // e.g. "images/"

// Option A: refresh while page is open (set to 0 to disable)
const AUTO_REFRESH_MS = 15000; // 15 seconds

/***********************
 * 2) MENU TOGGLE
 ***********************/
function setupMenu() {
  const btn = document.querySelector("[data-menu-button]");
  const panel = document.querySelector("[data-menu-panel]");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("isOpen");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("isOpen")) return;
    const clickedInside = panel.contains(e.target) || btn.contains(e.target);
    if (!clickedInside) {
      panel.classList.remove("isOpen");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

/***********************
 * 3) LOAD + RENDER PLACES
 ***********************/
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function normalizeImageUrl(image_url) {
  if (!image_url) return "";
  // If user stored full URL, keep it
  if (/^https?:\/\//i.test(image_url)) return image_url;
  // Otherwise prepend local path if you use /images/
  return IMAGE_BASE_PATH + image_url;
}

async function loadPlaces(category) {
  const grid = document.getElementById("placesGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="padding:16px;">Loading…</p>`;

  const { data, error } = await sb
    .from("places")
    .select("name, maps_url, description, image_url, subcategory, sort_order, created_at")
    .eq("category", category)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = `<p style="padding:16px;">Couldn’t load places.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p style="padding:16px;">No places yet.</p>`;
    return;
  }

  grid.innerHTML = data.map(place => {
    const imgUrl = normalizeImageUrl(place.image_url);

    const imgHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${escapeHtml(place.name)}">`
      : `<div class="imgPlaceholder"></div>`;

    return `
      <a class="placeCard" href="${place.maps_url}" target="_blank" rel="noopener">
        <div class="placeImage">${imgHtml}</div>
        <div class="placeBody">
          <h2 class="placeName">${escapeHtml(place.name)}</h2>
          <p class="placeDesc">${escapeHtml(place.description)}</p>
        </div>
      </a>
    `;
  }).join("");
}

/***********************
 * 4) BOOT
 ***********************/
(function init() {
  setupMenu();

  const category = document.body?.dataset?.category;
  if (!category) return; // home page (index.html)

  loadPlaces(category);

  if (AUTO_REFRESH_MS > 0) {
    setInterval(() => loadPlaces(category), AUTO_REFRESH_MS);
  }
})();
