import {
  fetchBahmsUser,
  fetchBahmsCaughtFish,
  fetchBahmsDuels,
  populateCacheFromUser,
  getCachedDisplayName,
  resolveBahmsDisplayName,
  BahmsUser,
  BahmsBadge,
  BahmsCaughtFish,
  BahmsFish,
  BahmsDuel,
} from "./bahms-api";
import * as Config from "./config";

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#9e9e9e",
  UNCOMMON: "#66bb6a",
  RARE: "#42a5f5",
  EPIC: "#ab47bc",
  LEGENDARY: "#ffa726",
  UNSET: "#555",
};

const RARITY_ORDER: Record<string, number> = {
  LEGENDARY: 0,
  EPIC: 1,
  RARE: 2,
  UNCOMMON: 3,
  COMMON: 4,
  UNSET: 5,
};

let badgePopoverInstance: HTMLElement | null = null;

function getBadgePopover(): HTMLElement {
  if (!badgePopoverInstance) {
    badgePopoverInstance = document.createElement("div");
    badgePopoverInstance.classList.add("bahms-badge-popover");

    const img = document.createElement("img");
    img.classList.add("bahms-badge-popover-img");
    const name = document.createElement("div");
    name.classList.add("bahms-badge-popover-name");
    const desc = document.createElement("div");
    desc.classList.add("bahms-badge-popover-desc");
    const date = document.createElement("div");
    date.classList.add("bahms-badge-popover-date");

    badgePopoverInstance.append(img, name, desc, date);
    document.body.appendChild(badgePopoverInstance);

    document.addEventListener("click", (e) => {
      if (
        badgePopoverInstance?.classList.contains("active") &&
        !badgePopoverInstance.contains(e.target as Node)
      ) {
        badgePopoverInstance.classList.remove("active");
      }
    });
  }
  return badgePopoverInstance;
}

function showBadgePopover(anchorEl: HTMLElement, badge: BahmsBadge): void {
  const pop = getBadgePopover();

  pop.querySelector<HTMLImageElement>(".bahms-badge-popover-img")!.src =
    `data:image/png;base64,${badge["img-base64"]}`;
  pop.querySelector<HTMLElement>(".bahms-badge-popover-name")!.textContent = badge.name;
  pop.querySelector<HTMLElement>(".bahms-badge-popover-desc")!.textContent = badge.description;
  pop.querySelector<HTMLElement>(".bahms-badge-popover-date")!.textContent =
    `Achieved ${new Date(badge["achieved-at"]).toLocaleDateString()}`;

  pop.classList.add("active");

  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const gap = 8;
  let left = rect.left + rect.width / 2 - popRect.width / 2;
  let top = rect.top - popRect.height - gap;
  if (top < 4) top = rect.bottom + gap;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

// main
export async function addBahmsSectionToCard(username: string, viewerCard: HTMLElement): Promise<void> {
  if (viewerCard.querySelector(".bahms-card")) return;

  const cardEl = viewerCard.childNodes[0] as HTMLElement;
  if (!cardEl) return;

  const container = document.createElement("div");
  container.classList.add("bahms-card", "bahms-loading-state");
  const spinner = document.createElement("div");
  spinner.classList.add("bahms-spinner");
  container.appendChild(spinner);
  cardEl.appendChild(container);

  const [user, caughtFish, duels] = await Promise.all([
    fetchBahmsUser(username),
    fetchBahmsCaughtFish(username),
    Config.FEATURE_RECENT_DUELS ? fetchBahmsDuels(username) : Promise.resolve([]),
  ]);

  if (!user) {
    container.style.display = "none";
    return;
  }

  populateCacheFromUser(user);

  // feature flag for duels history list
  if (Config.FEATURE_RECENT_DUELS) {
    const firstPageOpponents = [
      ...new Set(
        duels.slice(0, 5).flatMap((d) => [d.winner, d.loser]).filter((x) => x !== user.login && x !== user.id)
      ),
    ];
    await Promise.all(firstPageOpponents.map((o) => resolveBahmsDisplayName(o)));
  }

  container.classList.remove("bahms-loading-state");
  container.innerHTML = "";
  buildCard(container, user, caughtFish, duels);
}

// card builder
function buildCard(
  container: HTMLElement,
  user: BahmsUser,
  caughtFish: BahmsCaughtFish[],
  duels: BahmsDuel[]
): void {
  const header = document.createElement("div");
  header.classList.add("bahms-header");
  const logoLink = document.createElement("a");
  logoLink.className = "bahms-logo";
  logoLink.href = `https://bahms.org/usercard/${user.login}`;
  logoLink.target = "_blank";
  logoLink.rel = "noopener noreferrer";
  logoLink.innerHTML = `B.A.H.M.S. <svg class="bahms-logo-external" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7"/><polyline points="8 1 11 1 11 4"/><line x1="5.5" y1="6.5" x2="11" y2="1"/></svg>`;
  header.appendChild(logoLink);
  if (user["vip-level"] > 0) {
    header.appendChild(el("span", "bahms-vip-badge", `Giga-VIP Lvl. ${(user["vip-level"] / 1000).toFixed(3)}`));
  }
  container.appendChild(header);

  // badges row
  if (user.badges.length > 0) {
    const badgesRow = document.createElement("div");
    badgesRow.classList.add("bahms-badges-row");
    for (const badge of user.badges) {
      const img = document.createElement("img");
      img.src = `data:image/png;base64,${badge["img-base64"]}`;
      img.title = badge.name;
      img.classList.add("bahms-badge-icon");
      img.addEventListener("click", (e) => {
        e.stopPropagation();
        showBadgePopover(img, badge);
      });
      badgesRow.appendChild(img);
    }
    container.appendChild(badgesRow);
  }

  // tabs and contents
  const tabBar = document.createElement("div");
  tabBar.classList.add("bahms-tabs");
  const panelsWrap = document.createElement("div");
  panelsWrap.classList.add("bahms-panels");

  // hc for now
  const tabDefs: { label: string; key: string; builder: () => HTMLElement }[] = [
    { label: "Overview", key: "overview", builder: () => buildOverviewPanel(user) },
    { label: "Duels", key: "duels", builder: () => buildDuelsPanel(user, duels) },
    { label: "Fishing", key: "fishing", builder: () => buildFishingPanel(caughtFish) },
  ];

  const panels: HTMLElement[] = [];
  for (const def of tabDefs) {
    const btn = document.createElement("button");
    btn.classList.add("bahms-tab-btn");
    btn.dataset.tab = def.key;

    const labelSpan = document.createElement("span");
    labelSpan.textContent = def.label;
    btn.appendChild(labelSpan);

    if (def.key === "duels") {
      const allowed = user.settings["allow-duels"];
      const dot = document.createElement("span");
      dot.classList.add("bahms-tab-duel-indicator");
      dot.textContent = "●";
      dot.title = allowed ? "Accepts duels" : "Does not accept duels";
      dot.style.color = allowed ? "#66bb6a" : "#ef5350";
      btn.appendChild(dot);
    }

    tabBar.appendChild(btn);

    const panel = def.builder();
    panel.classList.add("bahms-panel");
    panel.dataset.panel = def.key;
    if (def.key !== "overview") panel.classList.add("bahms-hidden");
    panelsWrap.appendChild(panel);
    panels.push(panel);
  }

  (tabBar.firstElementChild as HTMLElement).classList.add("bahms-tab-active");

  tabBar.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".bahms-tab-btn");
    if (!btn?.dataset.tab) return;
    tabBar.querySelectorAll(".bahms-tab-btn").forEach((b) => b.classList.remove("bahms-tab-active"));
    btn.classList.add("bahms-tab-active");
    panels.forEach((p) => p.classList.toggle("bahms-hidden", p.dataset.panel !== btn.dataset.tab));
  });

  container.appendChild(tabBar);
  container.appendChild(panelsWrap);
}

// panels
function buildOverviewPanel(user: BahmsUser): HTMLElement {
  const panel = document.createElement("div");

  const displayName = user["preferred-name"] || user.login;
  const nameEl = el("div", "bahms-preferred-name", displayName);
  if (user.color) {
    const color = user.color.trim();
    nameEl.style.color = color.startsWith("#") ? color : `#${color}`;
  }
  panel.appendChild(nameEl);

  appendStatRow(panel, "Clock-ins", user["clock-ins"].toLocaleString());

  if (user.titles.length > 0) {
    appendSectionLabel(panel, "Titles");
    const titlesWrap = document.createElement("div");
    titlesWrap.classList.add("bahms-titles");
    for (const t of user.titles) {
      titlesWrap.appendChild(el("span", "bahms-title-chip", t));
    }
    panel.appendChild(titlesWrap);
  }

  return panel;
}

function buildDuelsPanel(user: BahmsUser, duels: BahmsDuel[]): HTMLElement {
  const panel = document.createElement("div");
  const elo = user.duels;
  const total = elo.wins + elo.losses;
  const winRate = total > 0 ? Math.round((elo.wins / total) * 100) : 0;

  const eloBlock = document.createElement("div");
  eloBlock.classList.add("bahms-elo-block");
  eloBlock.append(el("div", "bahms-elo-number", Math.round(elo.rating).toString()), el("div", "bahms-elo-label", "ELO Rating"));
  panel.appendChild(eloBlock);

  const wlRow = document.createElement("div");
  wlRow.classList.add("bahms-wl-row");
  wlRow.append(
    el("span", "bahms-wins", `${elo.wins}W`),
    el("span", "bahms-wl-sep", "/"),
    el("span", "bahms-losses", `${elo.losses}L`),
    el("span", "bahms-winrate", `${winRate}%`)
  );
  panel.appendChild(wlRow);

  if (Config.FEATURE_RECENT_DUELS && duels.length > 0) {
    const allowed = user.settings["allow-duels"];
    const labelRow = document.createElement("div");
    labelRow.classList.add("bahms-section-label-row");
    const labelEl = el("div", "bahms-section-label", "Recent Duels");
    const statusEl = el("span", "bahms-duel-status", allowed ? "Accepts Duels" : "No Duels");
    statusEl.style.color = allowed ? "#66bb6a" : "#ef5350";
    labelRow.append(labelEl, statusEl);
    panel.appendChild(labelRow);

    const PAGE_SIZE = 5;
    let loadedUpTo = 0;

    const list = document.createElement("div");
    list.classList.add("bahms-duels-list");

    function renderDuelRows(from: number, to: number) {
      for (const duel of duels.slice(from, to)) {
        const won = duel.winner === user.login || duel.winner === user.id;
        const opponentKey = won ? duel.loser : duel.winner;
        const opponentName = getCachedDisplayName(opponentKey);
        const row = document.createElement("div");
        row.classList.add("bahms-duel-row");
        row.append(
          el("span", won ? "bahms-duel-result bahms-duel-win" : "bahms-duel-result bahms-duel-loss", won ? "W" : "L"),
          el("span", "bahms-duel-opponent", `vs ${opponentName}`)
        );
        list.appendChild(row);
      }
      loadedUpTo = to;
    }

    renderDuelRows(0, Math.min(PAGE_SIZE, duels.length));
    panel.appendChild(list);

    if (duels.length > PAGE_SIZE) {
      const moreBtn = document.createElement("button");
      moreBtn.classList.add("bahms-duels-more-btn");
      moreBtn.textContent = "▼"; // if i had a dollar for every time i copy pasted this symbol i'd be a millionaire
      moreBtn.title = "Load more duels";
      panel.appendChild(moreBtn);
      moreBtn.addEventListener("click", async () => {
        moreBtn.disabled = true;
        moreBtn.textContent = "…";
        const nextTo = Math.min(loadedUpTo + PAGE_SIZE, duels.length);
        const newOpponents = [
          ...new Set(
            duels.slice(loadedUpTo, nextTo).flatMap((d) => [d.winner, d.loser]).filter((x) => x !== user.login && x !== user.id)
          ),
        ];
        await Promise.all(newOpponents.map((o) => resolveBahmsDisplayName(o)));
        renderDuelRows(loadedUpTo, nextTo);
        if (loadedUpTo >= duels.length) {
          moreBtn.remove();
        } else {
          moreBtn.disabled = false;
          moreBtn.textContent = "▼";
        }
      });
    }
  } else if (total === 0) {
    panel.appendChild(el("div", "bahms-empty", "No duels yet"));
  }

  return panel;
}

function buildFishingPanel(caughtFish: BahmsCaughtFish[]): HTMLElement {
  const panel = document.createElement("div");
  appendStatRow(panel, "Fish caught", caughtFish.length.toString());
  panel.appendChild(el("div", "bahms-rod-placeholder", "🎣 Rod stats - coming soon 🎣")); // prayge

  if (caughtFish.length === 0) {
    panel.appendChild(el("div", "bahms-empty", "No fish caught yet"));
    return panel;
  }

  appendSectionLabel(panel, "Caught Fish");

  // group
  const groups = new Map<number, { fish: BahmsFish; catches: BahmsCaughtFish[] }>();
  for (const entry of caughtFish) {
    const g = groups.get(entry.fish.id);
    if (g) g.catches.push(entry);
    else groups.set(entry.fish.id, { fish: entry.fish, catches: [entry] });
  }

  // pin most recent at top so you know what you got
  const groupList = [...groups.values()];
  const mostRecentId = groupList.reduce((best, g) => {
    const t = Math.max(...g.catches.map((c) => new Date(c["caught-at"]).getTime()));
    return t > best.t ? { id: g.fish.id, t } : best;
  }, { id: -1, t: -Infinity }).id;

  const sortedGroups = groupList.sort((a, b) => {
    if (a.fish.id === mostRecentId) return -1;
    if (b.fish.id === mostRecentId) return 1;
    return (RARITY_ORDER[a.fish.rarity] ?? 5) - (RARITY_ORDER[b.fish.rarity] ?? 5);
  });

  const list = document.createElement("div");
  list.classList.add("bahms-fish-list");

  for (const group of sortedGroups) {
    const sortedCatches = [...group.catches].sort(
      (a, b) => new Date(b["caught-at"]).getTime() - new Date(a["caught-at"]).getTime()
    );
    const latest = sortedCatches[0];

    const groupEl = document.createElement("div");
    groupEl.classList.add("bahms-fish-group");

    const row = document.createElement("div");
    row.classList.add("bahms-fish-group-row");

    const icon = document.createElement("img");
    icon.src = `data:image/png;base64,${group.fish["img-base64"]}`;
    icon.classList.add("bahms-fish-icon");
    icon.alt = group.fish.name;

    const info = document.createElement("div");
    info.classList.add("bahms-fish-info");
    const rarityColor = RARITY_COLORS[group.fish.rarity] ?? RARITY_COLORS.UNSET;
    const rarityBadge = el("span", "bahms-rarity-badge", group.fish.rarity);
    rarityBadge.style.color = rarityColor;
    rarityBadge.style.borderColor = rarityColor;

    const nameRow = document.createElement("div");
    nameRow.classList.add("bahms-fish-name-row");
    nameRow.appendChild(el("span", "bahms-fish-name", group.fish.name));
    if (group.fish.id === mostRecentId) {
      const pip = el("span", "bahms-fish-recent-pip", "✦");
      pip.title = "Most recently caught";
      nameRow.appendChild(pip);
    }
    info.append(nameRow, rarityBadge);

    const count = el("span", "bahms-fish-count", `x${group.catches.length}`);
    const chevron = el("span", "bahms-fish-chevron", "▶"); // chevron chevvy mccheverton
    row.append(icon, info, count, chevron);


    const details = document.createElement("div");
    details.classList.add("bahms-fish-details");

    const latestRow = document.createElement("div");
    latestRow.classList.add("bahms-fish-catch-row", "bahms-fish-catch-row--latest");
    latestRow.append(
      el("span", "bahms-fish-catch-date", new Date(latest["caught-at"]).toLocaleDateString()),
      el("span", "bahms-fish-catch-stats", `STR:${latest.strength} SPD:${latest.speed} CUN:${latest.cunning}`)
    );
    details.appendChild(latestRow);

    if (sortedCatches.length > 1) {
      for (const c of sortedCatches.slice(1)) {
        const catchRow = document.createElement("div");
        catchRow.classList.add("bahms-fish-catch-row");
        catchRow.append(
          el("span", "bahms-fish-catch-date", new Date(c["caught-at"]).toLocaleDateString()),
          el("span", "bahms-fish-catch-stats", `STR:${c.strength} SPD:${c.speed} CUN:${c.cunning}`)
        );
        details.appendChild(catchRow);
      }
    }

    row.addEventListener("click", () => groupEl.classList.toggle("bahms-expanded"));
    groupEl.append(row, details);
    list.appendChild(groupEl);
  }

  panel.appendChild(list);
  return panel;
}

// quick helper stuff
function el(tag: string, classes: string, text: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = classes;
  e.textContent = text;
  return e;
}

function appendStatRow(parent: HTMLElement, label: string, value: string): void {
  const row = document.createElement("div");
  row.classList.add("bahms-stat-row");
  row.append(el("span", "bahms-stat-label", label), el("span", "bahms-stat-value", value));
  parent.appendChild(row);
}

function appendSectionLabel(parent: HTMLElement, text: string): void {
  parent.appendChild(el("div", "bahms-section-label", text));
}
