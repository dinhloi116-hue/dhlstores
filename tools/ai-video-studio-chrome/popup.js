document.getElementById("open").addEventListener("click", async function () {
  await chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") });
  window.close();
});