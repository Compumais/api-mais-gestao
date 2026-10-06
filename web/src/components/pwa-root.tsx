"use client";

import { useEffect } from "react";

export function PwaRoot({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		let tinhaControle = !!navigator.serviceWorker.controller;
		const aoTrocarControle = () => {
			if (!tinhaControle) {
				tinhaControle = true;
				return;
			}
			window.location.reload();
		};
		navigator.serviceWorker.addEventListener(
			"controllerchange",
			aoTrocarControle,
		);

		let registro: ServiceWorkerRegistration | undefined;
		void navigator.serviceWorker
			.register("/serwist/sw.js", {
				scope: "/",
				updateViaCache: "none",
			})
			.then((atual) => {
				registro = atual;
				return atual.update();
			})
			.catch(() => undefined);

		const timer = window.setInterval(() => {
			void registro?.update();
		}, 60_000);

		return () => {
			window.clearInterval(timer);
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				aoTrocarControle,
			);
		};
	}, []);

	return children;
}
