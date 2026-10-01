(() => {
  "use strict";

  const resources = Array.isArray(window.RESOURCES) ? window.RESOURCES : [];
  const config = window.SITE_CONFIG || {};

  const els = {
    form: document.getElementById("filters"),
    search: document.getElementById("search"),
    technology: document.getElementById("technology"),
    accessibility: document.getElementById("accessibility"),
    type: document.getElementById("type"),
    audience: document.getElementById("audience"),
    sort: document.getElementById("sort"),
    grid: document.getElementById("resource-grid"),
    count: document.getElementById("result-count"),
    empty: document.getElementById("empty-state"),
    emptyClear: document.getElementById("empty-clear"),
    githubLink: document.getElementById("github-suggest-link"),
    githubMissing: document.getElementById("github-not-configured"),
    emailLink: document.getElementById("email-suggest-link"),
    emailMissing: document.getElementById("email-not-configured")
  };

  const normalize = value => String(value || "").trim().toLowerCase();

  const uniqueSorted = (field) => {
    const values = resources.flatMap(item => Array.isArray(item[field]) ? item[field] : []);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  };

  const addOptions = (select, values) => {
    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  };

  addOptions(els.technology, uniqueSorted("technology"));
  addOptions(els.accessibility, uniqueSorted("accessibility"));
  addOptions(els.type, uniqueSorted("type"));
  addOptions(els.audience, uniqueSorted("audience"));

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const matchesArray = (item, field, selected) => {
    if (!selected) return true;
    return Array.isArray(item[field]) && item[field].includes(selected);
  };

  const matchesSearch = (item, query) => {
    if (!query) return true;
    const haystack = [
      item.title,
      item.description,
      item.organisation,
      ...(item.type || []),
      ...(item.technology || []),
      ...(item.accessibility || []),
      ...(item.audience || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  };

  const getFiltered = () => {
    const q = normalize(els.search.value);
    return resources.filter(item =>
      matchesSearch(item, q) &&
      matchesArray(item, "technology", els.technology.value) &&
      matchesArray(item, "accessibility", els.accessibility.value) &&
      matchesArray(item, "type", els.type.value) &&
      matchesArray(item, "audience", els.audience.value)
    );
  };

  const sortItems = (items) => {
    const mode = els.sort.value;
    const copy = [...items];

    if (mode === "az") {
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (mode === "newest") {
      return copy.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));
    }
    return copy.sort((a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      a.title.localeCompare(b.title)
    );
  };

  const badge = text => `<span class="badge">${escapeHtml(text)}</span>`;

  const render = () => {
    els.grid.setAttribute("aria-busy", "true");
    const items = sortItems(getFiltered());

    els.count.textContent = `${items.length} resource${items.length === 1 ? "" : "s"} found`;
    els.empty.hidden = items.length !== 0;

    els.grid.innerHTML = items.map(item => {
      const badges = [
        ...(item.type || []).slice(0, 2),
        ...(item.technology || []).slice(0, 2)
      ].map(badge).join("");

      const rel = "noopener noreferrer";
      return `
        <article class="resource-card${item.featured ? " featured" : ""}">
          <div class="resource-meta">${badges}</div>
          <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="${rel}">${escapeHtml(item.title)}</a></h3>
          <p class="resource-description">${escapeHtml(item.description)}</p>
          <div class="resource-footer">
            <div>
              <p class="resource-org">${escapeHtml(item.organisation || "")}</p>
              <p class="resource-year">${escapeHtml(item.year || "")}</p>
            </div>
            <a class="external-link" href="${escapeHtml(item.url)}" target="_blank" rel="${rel}" aria-label="Open ${escapeHtml(item.title)} in a new tab">Visit resource ↗</a>
          </div>
        </article>
      `;
    }).join("");

    els.grid.setAttribute("aria-busy", "false");
  };

  const clearFilters = () => {
    els.form.reset();
    els.sort.value = "featured";
    render();
  };

  els.form.addEventListener("input", render);
  els.form.addEventListener("change", render);
  els.form.addEventListener("reset", () => setTimeout(render, 0));
  els.sort.addEventListener("change", render);
  els.emptyClear.addEventListener("click", clearFilters);

  document.querySelectorAll("[data-pathway]").forEach(button => {
    button.addEventListener("click", () => {
      const pathway = button.dataset.pathway;
      clearFilters();

      const presets = {
        design: { audience: "Designers" },
        develop: { audience: "Developers" },
        evaluate: { audience: "Evaluators" },
        research: { audience: "Researchers" }
      };

      const preset = presets[pathway];
      if (preset?.audience) els.audience.value = preset.audience;
      render();
      document.getElementById("resources").scrollIntoView({ behavior: "smooth", block: "start" });
      els.search.focus({ preventScroll: true });
    });
  });

  if (config.githubRepoUrl) {
    const issueUrl = `${config.githubRepoUrl.replace(/\/$/, "")}/issues/new?title=${encodeURIComponent("Resource suggestion: ")}&body=${encodeURIComponent("Resource title:\nURL:\nOrganisation:\nWhy it should be included:\nRelevant technology:\nAccessibility area:\nResource type:\nAudience:")}`;
    els.githubLink.href = issueUrl;
    els.githubLink.hidden = false;
    els.githubMissing.hidden = true;
  }

  if (config.contactEmail) {
    const subject = encodeURIComponent("Immersive accessibility resource suggestion");
    const body = encodeURIComponent("Resource title:\nURL:\nOrganisation:\nWhy it should be included:\nRelevant technology:\nAccessibility area:\nResource type:\nAudience:\n");
    els.emailLink.href = `mailto:${config.contactEmail}?subject=${subject}&body=${body}`;
    els.emailLink.hidden = false;
    els.emailMissing.hidden = true;
  }

  render();
})();
