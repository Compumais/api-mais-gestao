import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
	spawnSync("git", ["rev-parse", "HEAD"], {
		encoding: "utf-8",
	}).stdout?.trim() || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		additionalPrecacheEntries: [{ url: "/~offline", revision }],
		// Chunks do Next têm hash e são armazenados sob demanda pelas regras de
		// runtime. Colocá-los no precache faz a instalação inteira falhar quando
		// um deploy remove a geração anterior antes de o SW terminar de instalar.
		globPatterns: ["public/**/*"],
		manifestTransforms: [
			async (entries) => ({
				manifest: entries.filter(
					(entry) => !/(?:^|\/)static\/chunks\//.test(entry.url),
				),
				warnings: [],
			}),
		],
		swSrc: "src/app/sw.ts",
		useNativeEsbuild: true,
	});
