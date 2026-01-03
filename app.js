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
 * 3) HELPERS
 ***********************/
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[s]));
}

function normalizeImageUrl(image_url) {
  if (!image_url) return "";
  if (/^https?:\/\//i.test(image_url)) return image_url;
  return IMAGE_BASE_PATH + image_url;
}

function normalizeSubcategory(s) {
  const v = String(s ?? "").trim();
  return v.length ? v : "Other";
}

function titleCase(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/***********************
 * 4) UI INJECTION (Filters + Sections)
 ***********************/
function ensureEnhancementContainers() {
  const container = document.querySelector("main.container");
  const grid = document.getElementById("placesGrid");
  if (!container || !grid) return null;

  // Insert Filters right before the grid
  let filters = document.getElementById("filterChips");
  if (!filters) {
    filters = document.createElement("section");
    filters.id = "filterChips";
    filters.className = "filterChips";
    container.insertBefore(filters, grid);
  }

  // Insert Sections wrapper before grid; we render into this instead of the raw grid
  let sections = document.getElementById("sectionsWrap");
  if (!sections) {
    sections = document.createElement("section");
    sections.id = "sectionsWrap";
    sections.className = "sectionsWrap";
    container.insertBefore(sections, grid);
    grid.style.display = "none";
  }

  return { container, filters, sections, grid };
}

function renderSkeletons(sectionsEl, count = 6) {
  const cards = Array.from({ length: count })
    .map(
      () => `
    <div class="placeCard skeletonCard">
      <div class="placeImage skeleton"></div>
      <div class="placeBody">
        <div class="skeletonLine w60"></div>
        <div class="skeletonLine w90"></div>
        <div class="skeletonLine w75"></div>
      </div>
    </div>
  `
    )
    .join("");

  sectionsEl.innerHTML = `
    <div class="sectionBlock">
      <div class="sectionHeader">
        <h2 class="sectionTitle"><span class="skeletonLine w35" style="display:block; margin:0;"></span></h2>
      </div>
      <div class="cardGrid">${cards}</div>
    </div>
  `;
}

function buildFilterChips(filtersEl, subcats, active) {
  const unique = Array.from(new Set(subcats.map(normalizeSubcategory)));
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const chipHtml = (label, value) => `
    <button class="chip ${active === value ? "isActive" : ""}"
            type="button"
            data-chip="${escapeHtml(value)}">
      ${escapeHtml(label)}
    </button>
  `;

  filtersEl.innerHTML = `
    <div class="chipRow">
      ${chipHtml("All", "__all__")}
      ${unique.map((sc) => chipHtml(titleCase(sc), sc)).join("")}
    </div>
  `;
}

function groupBySubcategory(data, activeSubcat) {
  const filtered =
    activeSubcat && activeSubcat !== "__all__"
      ? data.filter((p) => normalizeSubcategory(p.subcategory) === activeSubcat)
      : data;

  const groups = new Map();
  for (const p of filtered) {
    const key = normalizeSubcategory(p.subcategory);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const keys = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  return { keys, groups };
}

function renderGroupedSections(sectionsEl, keys, groups) {
  let cardIndex = 0;

  const sectionHtml = keys
    .map((key) => {
      const places = groups.get(key) ?? [];

      const cards = places
        .map((place) => {
          const imgUrl = normalizeImageUrl(place.image_url);

          const imgHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${escapeHtml(place.name)}" loading="lazy">`
            : `<div class="imagePlaceholder">No image</div>`;

          const delay = Math.min(cardIndex * 35, 420); // stagger cap
          cardIndex++;

          return `
            <a class="placeCard" style="animation-delay:${delay}ms"
               href="${escapeHtml(place.maps_url)}" target="_blank" rel="noopener">
              <div class="placeImage">${imgHtml}</div>
              <div class="placeBody">
                <h3 class="placeName">${escapeHtml(place.name)}</h3>
                <p class="placeDesc">${escapeHtml(place.description ?? "")}</p>
              </div>
            </a>
          `;
        })
        .join("");

      return `
        <div class="sectionBlock">
          <div class="sectionHeader">
            <h2 class="sectionTitle">${escapeHtml(titleCase(key))}</h2>
            <div class="sectionCount">${places.length}</div>
          </div>
          <div class="cardGrid">
            ${cards || `<p class="hintText" style="padding:10px 2px;">No places in this subcategory.</p>`}
          </div>
        </div>
      `;
    })
    .join("");

  sectionsEl.innerHTML = sectionHtml;
}

/***********************
 * 5) LOAD + RENDER
 ***********************/
let _latestData = [];
let _activeSubcat = "__all__";

async function loadPlaces(category) {
  const ui = ensureEnhancementContainers();
  if (!ui) return;

  // Loading state
  renderSkeletons(ui.sections, 6);
  ui.filters.innerHTML = "";

  const { data, error } = await sb
    .from("places")
    .select("name, maps_url, description, image_url, subcategory, sort_order, created_at")
    .eq("category", category)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    ui.sections.innerHTML = `
      <div class="emptyState">
        <div class="emptyTitle">Couldn’t load places.</div>
        <div class="emptySub">Check your connection, then refresh.</div>
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    ui.sections.innerHTML = `
      <div class="emptyState">
        <div class="emptyTitle">🌱 Nothing here yet</div>
        <div class="emptySub">Add a few places in Supabase and they’ll show up here.</div>
      </div>
    `;
    return;
  }

  _latestData = data;

  // Filters
  buildFilterChips(ui.filters, data.map((p) => p.subcategory), _activeSubcat);

  // Grouped render
  const { keys, groups } = groupBySubcategory(data, _activeSubcat);
  renderGroupedSections(ui.sections, keys, groups);

  // Chip clicks
  ui.filters.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => {
      _activeSubcat = btn.getAttribute("data-chip");

      buildFilterChips(ui.filters, _latestData.map((p) => p.subcategory), _activeSubcat);
      const { keys, groups } = groupBySubcategory(_latestData, _activeSubcat);
      renderGroupedSections(ui.sections, keys, groups);

      ui.filters.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/***********************
 * 6) BOOT
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
