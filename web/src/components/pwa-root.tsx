"use client";

import { useEffect } from "react";

export function PwaRoot({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		void navigator.serviceWorker
			.register("/serwist/sw.js", {
				scope: "/",
				updateViaCache: "none",
			})
			.catch(() => undefined);
	}, []);

	return children;
}
