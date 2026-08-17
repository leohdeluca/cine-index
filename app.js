const state = { movies: [], query: "", decade: "all", quality: "all", sort: "year-asc", view: "grid" };

const grid = document.querySelector("#film-grid");
const empty = document.querySelector("#empty-state");
const filmDialog = document.querySelector("#film-dialog");

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
}[character]));

function visibleMovies() {
  const needle = state.query.trim().toLocaleLowerCase();
  return state.movies
    .filter((movie) => {
      const haystack = `${movie.title} ${movie.director ?? ""} ${movie.year ?? ""} ${(movie.genres ?? []).join(" ")}`.toLocaleLowerCase();
      const decade = movie.year ? String(Math.floor(movie.year / 10) * 10) : "unknown";
      return (!needle || haystack.includes(needle))
        && (state.decade === "all" || decade === state.decade)
        && (state.quality === "all" || movie.quality === state.quality);
    })
    .sort((a, b) => {
      if (state.sort === "title") return a.title.localeCompare(b.title);
      if (state.sort === "year-desc") return (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title);
      return (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title);
    });
}

function render() {
  const movies = visibleMovies();
  document.querySelector("#result-count").textContent = movies.length;
  empty.hidden = movies.length !== 0;
  grid.className = `film-grid ${state.view === "list" ? "list" : ""}`;
  grid.innerHTML = movies.map((movie, index) => `
    <button class="film-card" type="button" data-id="${movie.id}" aria-label="View ${escapeHtml(movie.title)}">
      <span class="poster">
        <img src="${escapeHtml(movie.poster)}" alt="" loading="lazy" />
        <span class="edition-number">${String(index + 1).padStart(3, "0")}</span>
      </span>
      <span class="film-copy">
        <h3>${escapeHtml(movie.title)}</h3>
        <p class="byline">${escapeHtml(movie.director || "Unknown director")}</p>
        <p>${movie.year ?? "Year unknown"} · ${escapeHtml(movie.quality)} · ${escapeHtml(movie.format)}</p>
      </span>
    </button>
  `).join("");
}

function openFilm(movie) {
  const mediaPath = movie.mediaType === "tv" ? "tv" : "movie";
  document.querySelector("#dialog-poster").src = movie.poster;
  document.querySelector("#dialog-poster").alt = `Poster for ${movie.title}`;
  document.querySelector("#dialog-kicker").textContent = movie.alternate ? "Alternate edition" : `${movie.year ?? "Undated"} · ${(movie.genres ?? []).join(" / ")}`;
  document.querySelector("#dialog-title").textContent = movie.title;
  document.querySelector("#dialog-director").textContent = movie.director || "Unknown director";
  document.querySelector("#dialog-overview").textContent = movie.overview || "No synopsis is available for this edition.";
  document.querySelector("#dialog-facts").innerHTML = [
    ["Year", movie.year ?? "—"], ["Runtime", movie.runtime ? `${movie.runtime} min` : "—"],
    ["Quality", movie.quality], ["Format", movie.format], ["Edition size", movie.size],
    ["Original title", movie.originalTitle || movie.tmdbTitle || movie.title],
  ].map(([term, description]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(description)}</dd></div>`).join("");
  document.querySelector("#dialog-tmdb").href = `https://www.themoviedb.org/${mediaPath}/${movie.tmdbId}`;
  filmDialog.showModal();
}

function populateControls() {
  const decades = [...new Set(state.movies.filter((movie) => movie.year).map((movie) => Math.floor(movie.year / 10) * 10))].sort((a, b) => a - b);
  document.querySelector("#decade").insertAdjacentHTML("beforeend", decades.map((decade) => `<option value="${decade}">${decade}s</option>`).join(""));
  const qualities = [...new Set(state.movies.map((movie) => movie.quality))].sort();
  document.querySelector("#quality").insertAdjacentHTML("beforeend", qualities.map((quality) => `<option>${escapeHtml(quality)}</option>`).join(""));
}

function populateSummary() {
  document.querySelector("#edition-count").textContent = state.movies.length;
  document.querySelector("#header-count").textContent = state.movies.length;
}

document.querySelector("#search").addEventListener("input", (event) => { state.query = event.target.value; render(); });
document.querySelector("#decade").addEventListener("change", (event) => { state.decade = event.target.value; render(); });
document.querySelector("#quality").addEventListener("change", (event) => { state.quality = event.target.value; render(); });
document.querySelector("#sort").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
document.querySelectorAll(".view-button").forEach((button) => button.addEventListener("click", () => {
  state.view = button.dataset.view;
  document.querySelectorAll(".view-button").forEach((item) => {
    item.classList.toggle("active", item === button);
    item.setAttribute("aria-pressed", String(item === button));
  });
  render();
}));
grid.addEventListener("click", (event) => {
  const card = event.target.closest(".film-card");
  if (card) openFilm(state.movies.find((movie) => movie.id === Number(card.dataset.id)));
});

document.querySelector("#dialog-close").addEventListener("click", () => filmDialog.close());
[filmDialog].forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

fetch("./movies.json")
  .then((response) => {
    if (!response.ok) throw new Error("Catalogue data is unavailable.");
    return response.json();
  })
  .then((movies) => {
    state.movies = movies;
    populateControls();
    populateSummary();
    render();
  })
  .catch(() => {
    document.querySelector("#result-count").textContent = "0";
    empty.hidden = false;
    empty.textContent = "The catalogue could not be loaded.";
  });
