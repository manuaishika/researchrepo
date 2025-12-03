// DOM Elements
const categoryList = document.getElementById("category-list");
const yearSelect = document.getElementById("year-select");
const currentCategoryTitle = document.getElementById("current-category-title");
const searchForm = document.getElementById("search-form");
const paperInput = document.getElementById("paper-input");
const autocompleteDropdown = document.getElementById("autocomplete-dropdown");
const popularPapersContainer = document.getElementById("popular-papers-container");
const videosContainer = document.getElementById("videos-container");
const reposContainer = document.getElementById("repos-container");
const resultsSection = document.getElementById("results-section");

let categories = [];
let availableYears = [];
let currentCategory = "All";
let currentYear = null;
let autocompleteSuggestions = [];
let selectedSuggestionIndex = -1;
let autocompleteDebounceTimer = null;

// Initialize app
async function init() {
  await Promise.all([loadCategories(), loadYears()]);
  setupEventListeners();
  // Load papers for current category
  await loadPopularPapers(currentCategory, currentYear);
  // Show results section by default (empty)
  resultsSection.classList.add("visible");
}

// Load categories from API
async function loadCategories() {
  try {
    const resp = await fetch("/api/categories");
    if (!resp.ok) throw new Error("Failed to load categories");
    const data = await resp.json();
    categories = data.categories || [];
    renderCategories();
  } catch (err) {
    console.error("Error loading categories:", err);
    categoryList.innerHTML = '<li class="category-item">Failed to load categories</li>';
  }
}

// Render categories in sidebar
function renderCategories() {
  if (categories.length === 0) {
    categoryList.innerHTML = '<li class="category-item">No categories available</li>';
    return;
  }

  const html = categories
    .map(
      (category) => `
    <li class="category-item ${category === currentCategory ? "active" : ""}" 
        data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
    </li>
  `
    )
    .join("");

  categoryList.innerHTML = html;

  // Add click handlers
  document.querySelectorAll(".category-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.classList.contains("loading")) return;

      // Update active state
      document.querySelectorAll(".category-item").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // Update current category and load papers
      currentCategory = item.dataset.category;
      currentCategoryTitle.textContent = currentCategory === "All" ? "Research Paper Explorer" : currentCategory;
      loadPopularPapers(currentCategory, currentYear);
    });
  });
}

// Load available years
async function loadYears() {
  try {
    const resp = await fetch("/api/years");
    if (!resp.ok) throw new Error("Failed to load years");
    const data = await resp.json();
    availableYears = data.years || [];
    renderYearSelector();
  } catch (err) {
    console.error("Error loading years:", err);
  }
}

// Render year selector
function renderYearSelector() {
  const html = availableYears
    .map((year) => `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`)
    .join("");

  yearSelect.innerHTML = '<option value="">All Years</option>' + html;
}

// Load popular papers
async function loadPopularPapers(category, year) {
  try {
    popularPapersContainer.innerHTML = '<div class="loading-state">Loading papers...</div>';

    let url = `/api/popular-papers?category=${encodeURIComponent(category)}`;
    if (year) {
      url += `&year=${year}`;
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Failed to load popular papers");
    const data = await resp.json();
    renderPopularPapers(data.papers || []);
  } catch (err) {
    console.error("Error loading popular papers:", err);
    popularPapersContainer.innerHTML =
      '<div class="empty-state">Failed to load popular papers</div>';
  }
}

// Render popular papers
function renderPopularPapers(papers) {
  if (!papers || papers.length === 0) {
    popularPapersContainer.innerHTML =
      '<div class="empty-state">No papers found for this category and year</div>';
    return;
  }

  const html = papers
    .map(
      (paper) => `
    <div class="paper-card" data-paper="${escapeHtml(paper.title)}" data-category="${escapeHtml(paper.category || "")}">
      <div class="paper-title">${escapeHtml(paper.title)}</div>
      <div class="paper-meta">
        <span class="paper-year">${paper.year || "N/A"}</span>
        ${paper.category && paper.category !== currentCategory ? `<span class="paper-category">${escapeHtml(paper.category)}</span>` : ""}
      </div>
    </div>
  `
    )
    .join("");

  popularPapersContainer.innerHTML = html;

  // Add click handlers to paper cards
  document.querySelectorAll(".paper-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const paperTitle = card.dataset.paper;
      paperInput.value = paperTitle;
      
      // Scroll to search form
      document.querySelector(".content-header").scrollIntoView({ 
        behavior: "smooth", 
        block: "center" 
      });
      
      // Focus search input and trigger search
      setTimeout(() => {
        paperInput.focus();
        // Optionally auto-search when clicking a paper
        // await performSearch(paperTitle);
      }, 300);
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Year selector change
  yearSelect.addEventListener("change", (event) => {
    currentYear = event.target.value || null;
    // Reload papers with new year filter
    loadPopularPapers(currentCategory, currentYear);
  });

  // Search input for autocomplete
  paperInput.addEventListener("input", handleSearchInput);
  
  // Keyboard navigation for autocomplete
  paperInput.addEventListener("keydown", handleAutocompleteKeyboard);
  
  // Hide autocomplete when clicking outside
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!paperInput.contains(target) && 
        !autocompleteDropdown.contains(target) && 
        !target.closest('.autocomplete-item')) {
      hideAutocomplete();
    }
  });

  // Search form submission
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = paperInput.value.trim();
    if (!query) return;

    hideAutocomplete();
    await performSearch(query);
  });
}

// Perform search
async function performSearch(query) {
  setLoading(true);

  try {
    let url = `/api/search?q=${encodeURIComponent(query)}`;
    if (currentCategory && currentCategory !== "All") {
      url += `&category=${encodeURIComponent(currentCategory)}`;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Search request failed. Please try again.");
    }

    const data = await resp.json();
    console.log("Search results:", data); // Debug log
    renderVideos(data.videos || []);
    renderRepos(data.repos || []);

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  } catch (err) {
    renderError(err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

// Set loading state
function setLoading(isLoading) {
  const loadingHtml = `
    <div class="loading-dots">
      <span class="pulse"></span>
      <span class="pulse"></span>
      <span class="pulse"></span>
    </div>
  `;

  if (isLoading) {
    videosContainer.innerHTML = loadingHtml;
    reposContainer.innerHTML = loadingHtml;
  }
}

// Render error
function renderError(message) {
  const html = `
    <div class="error-banner">
      ${escapeHtml(message)}
    </div>
  `;
  videosContainer.innerHTML = html;
  reposContainer.innerHTML = html;
}

// Render videos
function renderVideos(videos) {
  if (!videos || videos.length === 0) {
    videosContainer.innerHTML =
      '<div class="empty-state">No video explanations found</div>';
    return;
  }

  const html = videos
    .map(
      (video) => `
      <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="video-card">
        <div class="video-thumbnail">
          <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title)}" loading="lazy" />
        </div>
        <div class="video-details">
          <h3>${escapeHtml(video.title)}</h3>
          <p>${escapeHtml(video.channel)}</p>
          <p>${escapeHtml(video.views)} • ${escapeHtml(video.published)}</p>
        </div>
      </a>
    `
    )
    .join("");

  videosContainer.innerHTML = html;
}

// Render repos
function renderRepos(repos) {
  console.log("Rendering repos:", repos); // Debug log
  
  if (!repos || repos.length === 0) {
    reposContainer.innerHTML =
      '<div class="empty-state">No code implementations found</div>';
    return;
  }

  try {
    const html = repos
      .map(
        (repo) => {
          // Validate repo data
          if (!repo.url || !repo.name) {
            console.warn("Invalid repo data:", repo);
            return "";
          }
          
          return `
          <a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer" class="repo-card">
            <div class="repo-header">
              <h3>${escapeHtml(repo.name)}</h3>
              <div class="repo-stats">
                <div class="repo-stat">
                  <span>★</span>
                  <span>${formatNumber(repo.stars || 0)}</span>
                </div>
                <div class="repo-stat">
                  <span>⑂</span>
                  <span>${formatNumber(repo.forks || 0)}</span>
                </div>
              </div>
            </div>
            <div class="repo-details">
              <p>${escapeHtml(repo.author || "Unknown")} • ${escapeHtml(repo.language || "Various")}</p>
              <p>${escapeHtml(repo.description || "No description available")}</p>
            </div>
          </a>
        `;
        }
      )
      .filter(html => html !== "") // Remove empty strings
      .join("");

    if (!html) {
      reposContainer.innerHTML =
        '<div class="empty-state">No valid code implementations found</div>';
      return;
    }

    reposContainer.innerHTML = html;
  } catch (error) {
    console.error("Error rendering repos:", error);
    reposContainer.innerHTML =
      '<div class="empty-state">Error displaying code implementations</div>';
  }
}

// Handle search input for autocomplete
function handleSearchInput(event) {
  const query = event.target.value.trim();
  
  // Clear previous timer
  if (autocompleteDebounceTimer) {
    clearTimeout(autocompleteDebounceTimer);
  }
  
  // Hide autocomplete if query is too short
  if (query.length < 2) {
    hideAutocomplete();
    return;
  }
  
  // Debounce autocomplete requests
  autocompleteDebounceTimer = setTimeout(() => {
    loadAutocompleteSuggestions(query);
  }, 300);
}

// Load autocomplete suggestions
async function loadAutocompleteSuggestions(query) {
  try {
    const resp = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
    if (!resp.ok) return;
    
    const data = await resp.json();
    autocompleteSuggestions = data.suggestions || [];
    renderAutocompleteSuggestions();
  } catch (err) {
    console.error("Error loading autocomplete suggestions:", err);
    hideAutocomplete();
  }
}

// Render autocomplete suggestions
function renderAutocompleteSuggestions() {
  if (autocompleteSuggestions.length === 0) {
    hideAutocomplete();
    return;
  }
  
  selectedSuggestionIndex = -1;
  
  const html = autocompleteSuggestions
    .map(
      (suggestion, index) => `
      <div class="autocomplete-item" data-index="${index}" data-paper="${escapeHtml(suggestion.title)}">
        <div class="autocomplete-item-title">${escapeHtml(suggestion.title)}</div>
        <div class="autocomplete-item-meta">
          <span class="autocomplete-item-year">${suggestion.year || "N/A"}</span>
          ${suggestion.category ? `<span class="autocomplete-item-category">${escapeHtml(suggestion.category)}</span>` : ""}
        </div>
      </div>
    `
    )
    .join("");
  
  autocompleteDropdown.innerHTML = html;
  autocompleteDropdown.classList.add("visible");
  
  // Add click handlers
  document.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const paperTitle = item.dataset.paper;
      paperInput.value = paperTitle;
      hideAutocomplete();
      await performSearch(paperTitle);
    });
    
    item.addEventListener("mouseenter", () => {
      document.querySelectorAll(".autocomplete-item").forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
      selectedSuggestionIndex = parseInt(item.dataset.index);
    });
  });
}

// Handle keyboard navigation in autocomplete
function handleAutocompleteKeyboard(event) {
  if (!autocompleteDropdown.classList.contains("visible")) return;
  
  const items = document.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;
  
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
      updateSelectedSuggestion(items);
      break;
      
    case "ArrowUp":
      event.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSelectedSuggestion(items);
      break;
      
    case "Enter":
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < items.length) {
        event.preventDefault();
        const selectedItem = items[selectedSuggestionIndex];
        const paperTitle = selectedItem.dataset.paper;
        paperInput.value = paperTitle;
        hideAutocomplete();
        performSearch(paperTitle);
      }
      break;
      
    case "Escape":
      hideAutocomplete();
      paperInput.blur();
      break;
  }
}

// Update selected suggestion visually
function updateSelectedSuggestion(items) {
  items.forEach((item, index) => {
    item.classList.toggle("selected", index === selectedSuggestionIndex);
  });
  
  if (selectedSuggestionIndex >= 0) {
    items[selectedSuggestionIndex].scrollIntoView({ block: "nearest" });
  }
}

// Hide autocomplete dropdown
function hideAutocomplete() {
  autocompleteDropdown.classList.remove("visible");
  autocompleteDropdown.innerHTML = "";
  autocompleteSuggestions = [];
  selectedSuggestionIndex = -1;
}

// Utility functions
function formatNumber(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return String(num);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}