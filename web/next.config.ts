import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const origensDevPermitidas =
	process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
		.map((origem) => origem.trim())
		.filter(Boolean) ?? [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	];

const nextConfig: NextConfig = {
	turbopack: {
		root,
	},
	allowedDevOrigins: origensDevPermitidas,
	reactCompiler: true,
};

export default nextConfig;
