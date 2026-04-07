type RouteHandler = (params: Record<string, string>) => void;

interface Route {
	path: string;
	regex: RegExp;
	keys: string[];
	handler: RouteHandler;
}

export class Router {
	private routes: Route[] = [];
	private defaultHandler: RouteHandler | null = null;

	constructor() {
		window.addEventListener("hashchange", () => this.handleRoute());
		window.addEventListener("load", () => this.handleRoute());
	}

	/**
	 * Registers a new route.
	 * Path can include parameters like :id (e.g., "/edit/:id")
	 */
	public on(path: string, handler: RouteHandler): this {
		const keys: string[] = [];
		// Convert path to regex, e.g., "/edit/:id" -> /^\/edit\/([^/]+)$/
		const regexPath = path
			.replace(/:([^/]+)/g, (_, key) => {
				keys.push(key);
				return "([^/]+)";
			})
			.replace(/\//g, "\\/");

		this.routes.push({
			path,
			regex: new RegExp(`^${regexPath}$`),
			keys,
			handler,
		});
		return this;
	}

	/**
	 * Sets a default handler if no routes match.
	 */
	public default(handler: RouteHandler): this {
		this.defaultHandler = handler;
		return this;
	}

	/**
	 * Programmatically navigate to a path.
	 */
	public navigate(path: string): void {
		window.location.hash = path.startsWith("#") ? path : `#${path}`;
	}

	/**
	 * Logic to match the current hash against registered routes.
	 */
	public handleRoute(): void {
		// Strip the '#' from the beginning of the hash
		const hash = window.location.hash.slice(1) || "/";
		console.log(`Router: Handling route for hash: "${hash}"`);

		for (const route of this.routes) {
			const match = hash.match(route.regex);
			if (match) {
				console.log(`Router: Matched route: "${route.path}"`);
				const params: Record<string, string> = {};
				route.keys.forEach((key, index) => {
					params[key] = match[index + 1];
				});
				route.handler(params);
				return;
			}
		}

		// If no match found, use default handler
		if (this.defaultHandler) {
			console.log("Router: No match found, using default handler");
			this.defaultHandler({});
		} else {
			console.warn("Router: No match found and no default handler defined");
		}
	}
}

export const router = new Router();
