import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: [
				"bookmark.svg",
				"favicon.ico",
				"apple-touch-icon.png",
				"robots.txt",
			],
			manifest: {
				name: "Bookmarks",
				short_name: "Bookmarks",
				description: "A simple, encrypted bookmark manager.",
				theme_color: "#2563eb",
				background_color: "#242424",
				display: "standalone",
				icons: [
					{
						src: "bookmark.svg",
						sizes: "192x192",
						type: "image/svg+xml",
					},
					{
						src: "bookmark.svg",
						sizes: "512x512",
						type: "image/svg+xml",
					},
					{
						src: "bookmark.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,json,txt}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/favicon\.im\/.*/i,
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "site-icons-cache",
							expiration: {
								maxEntries: 1000,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
});
