import "./style.css";
import { setupCounter } from "./counter.ts";
import { loadStore } from "./store.ts";
import { showVersion } from "./version.ts";
import { setupBookmarks } from "./bookmark.ts";
import { initModal } from "./modal.ts";

loadStore();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="card">
    <button id="counter" type="button"></button>
  </div>
  <div id="bookmarks"></div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
setupBookmarks(document.querySelector<HTMLDivElement>("#bookmarks")!);
showVersion(document.querySelector<HTMLElement>("#version")!);
initModal();
