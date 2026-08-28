import type { MetadataRoute } from "next";
import {
	PWA_APP_NAME,
	PWA_BACKGROUND_COLOR,
	PWA_DESCRIPTION,
	PWA_SHORT_NAME,
	PWA_START_URL,
	PWA_THEME_COLOR,
} from "@/constants/pwa";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: PWA_APP_NAME,
		short_name: PWA_SHORT_NAME,
		description: PWA_DESCRIPTION,
		start_url: PWA_START_URL,
		scope: "/",
		display: "standalone",
		orientation: "any",
		lang: "pt-BR",
		dir: "ltr",
		theme_color: PWA_THEME_COLOR,
		background_color: PWA_BACKGROUND_COLOR,
		icons: [
			{
				src: "/icons/icon-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icons/icon-512x512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/icons/icon-maskable-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/icons/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	};
}
