import p from "../package.json";

export function showVersion(element: HTMLElement) {
	element.innerText = getVersion();
}

export function getVersion(callback?: (v: string) => void) {
	const v = `${p.name} v.${p.version} by ${p.author.name}`;
	if (callback) callback(v);
	return v;
}
