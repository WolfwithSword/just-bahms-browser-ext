import { addBahmsSectionToCard } from "./bahms-usercard";
import browser from "webextension-polyfill";

let currentChatContainer: HTMLElement | null = null;
let currentNativeUsercardObserver: MutationObserver | null = null;
let currentSevenTvUsercardObserver: MutationObserver | null = null;
let currentChannelName: string = "";

let settingBahmsAllChannels = false;
let settingBahmsChannels: string[] = ["just__jane"];

applySettings();
startSupervisor();

async function applySettings() {
  const result: { bahmsAllChannels?: boolean; bahmsChannels?: string[] } =
    await browser.storage.sync.get(["bahmsAllChannels", "bahmsChannels"]);
  settingBahmsAllChannels = result.bahmsAllChannels ?? false;
  settingBahmsChannels = result.bahmsChannels ?? ["just__jane"];
}

function isBahmsEnabledForChannel(channel: string): boolean {
  if (settingBahmsAllChannels) return true;
  return settingBahmsChannels.map((c) => c.toLowerCase()).includes(channel.toLowerCase());
}

browser.storage.onChanged.addListener((_changes, namespace) => {
  if (namespace === "sync") {
    applySettings();
  }
});

function startSupervisor() {
  setInterval(() => {
    if (currentChatContainer && document.body.contains(currentChatContainer)) return;

    const sevenTvChatContainer = document.querySelector<HTMLElement>(".seventv-chat-list main");
    if (sevenTvChatContainer) {
      if (currentChatContainer !== sevenTvChatContainer) mountObserver(sevenTvChatContainer);
      return;
    }

    const nativeChatContainer = document.querySelector<HTMLElement>(".chat-scrollable-area__message-container");
    if (nativeChatContainer) {
      if (currentChatContainer !== nativeChatContainer) mountObserver(nativeChatContainer);
      return;
    }

    const vodChatContainer = document.querySelector<HTMLElement>('ul[class^="InjectLayout-sc"]');
    if (vodChatContainer) {
      if (currentChatContainer !== vodChatContainer) mountObserver(vodChatContainer);
      return;
    }

    if (currentChatContainer && !document.body.contains(currentChatContainer)) {
      disconnectObserver();
    }

    // handle popout viewercards
    // viewercard url: https://www.twitch.tv/popout/CHANNEL/viewercard/USER?popout=
    const path = window.location.pathname.toLowerCase();
    const pathItems = path.split("/").filter((seq) => seq.length > 0);
    if (!pathItems.includes("viewercard")) return;

    currentChannelName = pathItems[1];
    handlePopoutUsercard(pathItems[3]);
  }, 5000);
}

function getChannelNameFromTwitch(): string | undefined {
  const channelInfoElement = document.querySelector<HTMLDivElement>(".channel-info-content");
  const hostingChannelElements = channelInfoElement?.querySelectorAll<HTMLLinkElement>('a[href^="/"]');
  if (!hostingChannelElements) return;

  const channelLinks = Array.from(hostingChannelElements).filter((element) => {
    return element.href.split("/").length === 4;
  });

  return channelLinks[0]?.href.split(".tv/")[1];
}

function mountObserver(container: HTMLElement) {
  disconnectObserver();
  currentChatContainer = container;

  const path = window.location.pathname.toLowerCase();
  const pathItems = path.split("/").filter((seq) => seq.length > 0);
  for (let i = 0; i < pathItems.length; i++) {
    const item = pathItems[i];
    if (item !== "moderator" && item !== "popout") {
      currentChannelName = item;
      break;
    }
  }

  if (currentChannelName === "videos") {
    currentChannelName = getChannelNameFromTwitch() || "";
  }
  if (currentChannelName === "") return;

  startNativeUsercardObserver();
  startSevenTvUsercardObserver();
}

function handlePopoutUsercard(username: string) {
  const viewerCard = document.querySelector<HTMLElement>("#VIEWER_CARD_ID");
  if (!viewerCard) return;
  if (viewerCard.querySelector<HTMLElement>(".bahms-card")) return;
  if (isBahmsEnabledForChannel(currentChannelName)) addBahmsSectionToCard(username, viewerCard);
}

function startNativeUsercardObserver() {
  const popupLayer = document.querySelector<HTMLElement>(".viewer-card-layer");
  if (!popupLayer) return;

  currentNativeUsercardObserver = new MutationObserver(() => {
    if (popupLayer.childElementCount === 0) return;
    if (popupLayer.querySelector<HTMLElement>(".bahms-card")) return;

    const nameTag = popupLayer.querySelector<HTMLLinkElement>("a");
    if (!nameTag || nameTag.innerText.length === 0) return;
    const viewerCard = popupLayer.querySelector<HTMLElement>("#VIEWER_CARD_ID");
    if (!viewerCard) return;
    const nativeUsername = handleUsernameLocalization(nameTag.innerText).toLowerCase();
    if (isBahmsEnabledForChannel(currentChannelName)) addBahmsSectionToCard(nativeUsername, viewerCard);
  });
  currentNativeUsercardObserver.observe(popupLayer, { childList: true, subtree: true });
}

function startSevenTvUsercardObserver() {
  const popupLayer = document.querySelector<HTMLElement>("#seventv-float-context");
  if (!popupLayer) return;

  currentSevenTvUsercardObserver = new MutationObserver(() => {
    if (popupLayer.childElementCount === 0) return;
    for (const usercard of Array.from(popupLayer.children)) {
      if (usercard.querySelector<HTMLElement>(".bahms-card")) continue;

      const nameTag = usercard.querySelector<HTMLElement>(".seventv-chat-user-username");
      if (!nameTag) continue;
      const seventvViewerCard = usercard.querySelector<HTMLElement>(".seventv-user-card");
      if (!seventvViewerCard) continue;
      const stvUsername = handleUsernameLocalization(nameTag.innerText).toLowerCase();
      if (isBahmsEnabledForChannel(currentChannelName)) addBahmsSectionToCard(stvUsername, seventvViewerCard);
    }
  });
  currentSevenTvUsercardObserver.observe(popupLayer, { childList: true, subtree: false });
}

function disconnectObserver() {
  currentChatContainer = null;

  if (currentNativeUsercardObserver) {
    currentNativeUsercardObserver.disconnect();
    currentNativeUsercardObserver = null;
  }
  if (currentSevenTvUsercardObserver) {
    currentSevenTvUsercardObserver.disconnect();
    currentSevenTvUsercardObserver = null;
  }
}

function handleUsernameLocalization(username: string): string {
  if (username.includes("(")) return username.split("(")[1].slice(0, -1);
  return username;
}
