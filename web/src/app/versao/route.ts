import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function lerBuildIdPublicado(): string {
	if (process.env.NODE_ENV !== "production") return "dev";

	try {
		return readFileSync(
			path.join(process.cwd(), ".next", "BUILD_ID"),
			"utf8",
		).trim();
	} catch {
		return "dev";
	}
}

export function GET() {
	return new Response(lerBuildIdPublicado(), {
		headers: {
			"Cache-Control": "no-store, no-cache, must-revalidate",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
