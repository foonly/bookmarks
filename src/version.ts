import p from "../package.json";

export function showVersion(element: HTMLElement) {
  element.innerText = `${p.name} v.${p.version} by ${p.author.name}`;
}
