import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
	turbopack: {
		root,
	},
	allowedDevOrigins: [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"http://192.168.2.51:3333",
	],
	reactCompiler: true,
};

export default nextConfig;
