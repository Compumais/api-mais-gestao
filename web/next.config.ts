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
	async redirects() {
		return [
			{
				source: "/gourmet/venda-rapida",
				destination: "/pdv",
				permanent: true,
			},
			{
				source: "/nota-fiscal-compra/relatorio",
				destination: "/contabilidade/relatorios/compras",
				permanent: true,
			},
			{
				source: "/nota-fiscal-venda/relatorio",
				destination: "/contabilidade/relatorios/vendas",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
