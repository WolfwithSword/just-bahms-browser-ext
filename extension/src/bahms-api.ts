const BASE_URL = "https://api.bahms.org";

export interface BahmsUser {
  id: string;
  login: string;
  name: string;
  "preferred-name": string;
  "profile-image-url": string;
  "vip-level": number;
  "clock-ins": number;
  color: string | null;
  titles: string[];
  badges: BahmsBadge[];
  duels: BahmsELO;
  settings: BahmsSettings;
}

export interface BahmsBadge {
  id: number;
  name: string;
  description: string;
  "achieved-at": string;
  "img-base64": string;
}

export interface BahmsELO {
  rating: number;
  wins: number;
  losses: number;
}

export interface BahmsSettings {
  "allow-duels": boolean;
}

export interface BahmsCaughtFish {
  fish: BahmsFish;
  "caught-at": string;
  stamina: number;
  strength: number;
  speed: number;
  cunning: number;
}

export interface BahmsFish {
  id: number;
  name: string;
  rarity: "UNSET" | "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  environment: "UNSET" | "FRESHWATER" | "SALTWATER" | "ABYSS";
  "img-base64": string;
}

export interface BahmsDuel {
  // Subject to change. Feature flag disables it atm.
  id: string;
  initiator: string;
  winner: string;
  loser: string;
  "start-at": string;
  "draw-at": string;
  "end-at": string;
  shots: { player: string; timestamp: string }[];
}

export async function fetchBahmsUser(login: string): Promise<BahmsUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/user/${encodeURIComponent(login)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchBahmsCaughtFish(login: string): Promise<BahmsCaughtFish[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/fishing/${encodeURIComponent(login)}/caught`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchBahmsDuels(login: string): Promise<BahmsDuel[]> {
  try {
    const res = await fetch(`${BASE_URL}/v1/user/${encodeURIComponent(login)}/duels-test`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// User name via id cache
// reduce calls in the case of when duels feature flag is true
const usernameCache = new Map<string, string>();

export function populateCacheFromUser(user: BahmsUser): void {
  const display = user["preferred-name"] || user.login;
  usernameCache.set(user.id, display);
  usernameCache.set(user.login, display);
}

export function getCachedDisplayName(idOrLogin: string): string {
  return usernameCache.get(idOrLogin) ?? idOrLogin;
}

export async function resolveBahmsDisplayName(idOrLogin: string): Promise<string> {
  if (usernameCache.has(idOrLogin)) return usernameCache.get(idOrLogin)!;
  const user = await fetchBahmsUser(idOrLogin);
  if (user) {
    populateCacheFromUser(user);
    return user["preferred-name"] || user.login;
  }
  usernameCache.set(idOrLogin, idOrLogin);
  return idOrLogin;
}
