
const candidates = {
  boys: [
    { id: "maxwell", name: "Maxwell Stone" },
    { id: "alexander", name: "Alexander Vance" },
    { id: "ethan", name: "Ethan Cole" }
  ],
  girls: [
    { id: "sophia", name: "Sophia Lane" },
    { id: "olivia", name: "Olivia Rose" },
    { id: "emma", name: "Emma Grace" }
  ]
};

const categories = ["king", "smart", "popular"];
const STORAGE_KEY = "uw_category_votes_2026";

function emptyData() {
  return {
    selections: { boys: {}, girls: {} },
    counts: {
      boys: { king: {}, smart: {}, popular: {} },
      girls: { king: {}, smart: {}, popular: {} }
    }
  };
}

function getData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && saved.selections && saved.counts ? saved : emptyData();
  } catch {
    return emptyData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restoreSelections() {
  const data = getData();
  document.querySelectorAll('.category-option input[type="radio"]').forEach(input => {
    const selected = data.selections[input.dataset.group]?.[input.dataset.id];
    input.checked = selected === input.value;
  });
}

document.querySelectorAll('.category-option input[type="radio"]').forEach(input => {
  input.addEventListener("change", () => {
    if (!input.checked) return;

    const group = input.dataset.group;
    const candidateId = input.dataset.id;
    const newCategory = input.value;

    const data = getData();
    const oldCategory = data.selections[group][candidateId];

    if (oldCategory === newCategory) return;

    if (oldCategory) {
      const oldCount = data.counts[group][oldCategory][candidateId] || 0;
      data.counts[group][oldCategory][candidateId] = Math.max(0, oldCount - 1);
    }

    data.counts[group][newCategory][candidateId] =
      (data.counts[group][newCategory][candidateId] || 0) + 1;

    data.selections[group][candidateId] = newCategory;
    saveData(data);
  });
});

function renderCategoryResult(group, category, elementId) {
  const target = document.getElementById(elementId);
  if (!target) return;

  const data = getData();
  const counts = data.counts[group][category] || {};

  const rows = candidates[group]
    .map(candidate => ({
      ...candidate,
      count: counts[candidate.id] || 0
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const highest = rows.length ? rows[0].count : 0;

  if (total === 0) {
    target.innerHTML = '<div class="empty-state">No votes in this category yet.</div>';
    return;
  }

  target.innerHTML = rows.map((row, index) => {
    const percent = total ? Math.round((row.count / total) * 100) : 0;
    const isWinner = row.count === highest && highest > 0;

    return `
      <div class="rank-item">
        <div class="rank-top">
          <span class="rank-name">
            ${index + 1}. ${row.name}
            ${isWinner ? '<span class="winner-badge"><i class="fa-solid fa-crown"></i> Leading</span>' : ''}
          </span>
          <span class="rank-count">${row.count} vote${row.count === 1 ? "" : "s"} · ${percent}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${percent}%"></div>
        </div>
      </div>`;
  }).join("");
}

function renderAllResults() {
  ["boys", "girls"].forEach(group => {
    categories.forEach(category => {
      renderCategoryResult(group, category, `${group}-${category}-results`);
    });
  });
}

restoreSelections();
renderAllResults();

const resetButton = document.getElementById("resetVotes");
if (resetButton) {
  resetButton.addEventListener("click", () => {
    if (confirm("Reset all King, Smart and Popular votes saved in this browser?")) {
      localStorage.removeItem(STORAGE_KEY);
      restoreSelections();
      renderAllResults();
    }
  });
}
