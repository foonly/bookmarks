import "./style.css";
import { loadStore } from "./store.ts";
import { showVersion } from "./version.ts";
import { renderBookmarks } from "./bookmark.ts";
import { BOOKMARKS_ID } from "./constants.ts";

loadStore();

document.querySelector<HTMLDivElement>("#app")!.append(createBookmarks());

renderBookmarks();
showVersion(document.querySelector<HTMLElement>("#version")!);

function createBookmarks() {
  const bookmarks = document.createElement("div");
  bookmarks.classList.add("card");
  bookmarks.id = BOOKMARKS_ID;

  return bookmarks;
}
