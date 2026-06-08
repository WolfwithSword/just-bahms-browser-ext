import browser from "webextension-polyfill";

document.addEventListener("DOMContentLoaded", main);

async function main() {
  handleBahmsSettings();
}

async function handleBahmsSettings() {
  const result: { bahmsAllChannels?: boolean; bahmsChannels?: string[] } = await browser.storage.sync.get([
    "bahmsAllChannels",
    "bahmsChannels",
  ]);

  let allChannels = result.bahmsAllChannels ?? false;
  let channels: string[] = result.bahmsChannels ?? ["just__jane"];

  const allChannelsCheckbox = document.getElementById("bahmsAllChannels") as HTMLInputElement;
  const channelManager = document.getElementById("bahms-channel-manager") as HTMLElement;
  const channelsContainer = document.getElementById("bahms-channels") as HTMLElement;
  const channelInput = document.getElementById("bahmsChannelInput") as HTMLInputElement;
  const addBtn = document.getElementById("bahmsAddChannel") as HTMLButtonElement;

  allChannelsCheckbox.checked = allChannels;
  channelManager.style.display = allChannels ? "none" : "";

  function renderChannels() {
    channelsContainer.innerHTML = "";
    for (const ch of channels) {
      const chip = document.createElement("div");
      chip.classList.add("bahms-channel-chip");

      const name = document.createElement("span");
      name.textContent = ch;

      const removeBtn = document.createElement("button");
      removeBtn.classList.add("bahms-channel-remove");
      removeBtn.textContent = "x";
      removeBtn.addEventListener("click", () => {
        channels = channels.filter((c) => c !== ch);
        browser.storage.sync.set({ bahmsChannels: channels });
        renderChannels();
      });

      chip.append(name, removeBtn);
      channelsContainer.appendChild(chip);
    }
  }

  renderChannels();

  allChannelsCheckbox.addEventListener("change", () => {
    allChannels = allChannelsCheckbox.checked;
    channelManager.style.display = allChannels ? "none" : "";
    browser.storage.sync.set({ bahmsAllChannels: allChannels });
  });

  function addChannel() {
    const ch = channelInput.value.trim().toLowerCase();
    if (!ch || channels.includes(ch)) {
      channelInput.value = "";
      return;
    }
    channels = [...channels, ch];
    browser.storage.sync.set({ bahmsChannels: channels });
    channelInput.value = "";
    renderChannels();
  }

  addBtn.addEventListener("click", addChannel);
  channelInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addChannel();
  });
}
