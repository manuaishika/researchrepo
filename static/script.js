const searchForm = document.getElementById("search-form");
const paperInput = document.getElementById("paper-input");
const videosContainer = document.getElementById("videos-container");
const reposContainer = document.getElementById("repos-container");

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

function renderError(message) {
  const html = `
    <div class="error-banner">
      ${message}
    </div>
  `;
  videosContainer.innerHTML = html;
  reposContainer.innerHTML = html;
}

function renderVideos(videos) {
  if (!videos || videos.length === 0) {
    videosContainer.innerHTML =
      '<div class="empty-state">No video explanations found</div>';
    return;
  }

  const html = videos
    .map(
      (video) => `
      <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-card">
        <div class="video-thumbnail">
          <img src="${video.thumbnail}" alt="${video.title}" />
        </div>
        <div class="video-details">
          <h3>${video.title}</h3>
          <p>${video.channel}</p>
          <p>${video.views} • ${video.published}</p>
        </div>
      </a>
    `
    )
    .join("");

  videosContainer.innerHTML = html;
}

function renderRepos(repos) {
  if (!repos || repos.length === 0) {
    reposContainer.innerHTML =
      '<div class="empty-state">No code implementations found</div>';
    return;
  }

  const html = repos
    .map(
      (repo) => `
      <a href="${repo.url}" target="_blank" rel="noopener noreferrer" class="repo-card">
        <div class="repo-header">
          <h3>${repo.name}</h3>
          <div class="repo-stats">
            <div class="repo-stat">
              <span>★</span>
              <span>${formatNumber(repo.stars)}</span>
            </div>
            <div class="repo-stat">
              <span>⑂</span>
              <span>${formatNumber(repo.forks)}</span>
            </div>
          </div>
        </div>
        <div class="repo-details">
          <p>${repo.author} • ${repo.language || "Various"}</p>
          <p>${repo.description || "No description available"}</p>
        </div>
      </a>
    `
    )
    .join("");

  reposContainer.innerHTML = html;
}

function formatNumber(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return String(num);
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = paperInput.value.trim();
  if (!query) return;

  setLoading(true);

  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!resp.ok) {
      throw new Error("Search request failed. Please try again.");
    }
    const data = await resp.json();
    renderVideos(data.videos || []);
    renderRepos(data.repos || []);
  } catch (err) {
    renderError(err.message || "Something went wrong. Please try again.");
  }
});


