import { name, version, author } from "../package.json";

/** The app name, version and author, as shown in the footer. */
export function getVersion(): string {
	return `${name} v.${version} by ${author.name}`;
}
