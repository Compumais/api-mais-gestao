import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST() {
	revalidateTag("prismic", "max");

	return NextResponseon({ revalidated: true, now: Date.now() });
}
