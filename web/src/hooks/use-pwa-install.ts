"use client";

import { useCallback, useEffect, useState } from "react";
import { PWA_DISMISS_STORAGE_KEY } from "@/constants/pwa";
import {
	isPwaInstallDismissed,
	markPwaInstallDismissed,
} from "@/lib/pwa-install-dismiss";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode() {
	if (typeof window === "undefined") return false;

	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		("standalone" in window.navigator &&
			Boolean(
				(window.navigator as Navigator & { standalone?: boolean }).standalone,
			))
	);
}

function isIosSafari() {
	if (typeof window === "undefined") return false;

	const ua = window.navigator.userAgent;
	const isIos = /iPad|iPhone|iPod/.test(ua);
	const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
	return isIos && isSafari;
}

export function usePwaInstall() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isDismissed, setIsDismissed] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [showIosInstructions, setShowIosInstructions] = useState(false);

	useEffect(() => {
		if (isDismissed || isStandaloneMode() || isPwaInstallDismissed()) {
			setDeferredPrompt(null);
			setIsVisible(false);
			return;
		}

		const handleStorage = (event: StorageEvent) => {
			if (event.key === PWA_DISMISS_STORAGE_KEY && isPwaInstallDismissed()) {
				setIsDismissed(true);
				setDeferredPrompt(null);
				setIsVisible(false);
			}
		};

		if (isIosSafari()) {
			setShowIosInstructions(true);
			setIsVisible(true);
			window.addEventListener("storage", handleStorage);
			return () => {
				window.removeEventListener("storage", handleStorage);
			};
		}

		const handleBeforeInstallPrompt = (event: Event) => {
			if (isStandaloneMode() || isPwaInstallDismissed()) {
				return;
			}
			event.preventDefault();
			setDeferredPrompt(event as BeforeInstallPromptEvent);
			setIsVisible(true);
		};

		const handleAppInstalled = () => {
			setDeferredPrompt(null);
			setIsVisible(false);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);
		window.addEventListener("storage", handleStorage);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
			window.removeEventListener("appinstalled", handleAppInstalled);
			window.removeEventListener("storage", handleStorage);
		};
	}, [isDismissed]);

	const dismiss = useCallback(() => {
		markPwaInstallDismissed();
		setIsDismissed(true);
		setDeferredPrompt(null);
		setIsVisible(false);
	}, []);

	const install = useCallback(async () => {
		if (!deferredPrompt) return;

		setIsInstalling(true);
		try {
			await deferredPrompt.prompt();
			const choice = await deferredPrompt.userChoice;
			if (choice.outcome === "accepted") {
				setIsVisible(false);
			} else {
				dismiss();
			}
		} finally {
			setDeferredPrompt(null);
			setIsInstalling(false);
		}
	}, [deferredPrompt, dismiss]);

	return {
		isVisible,
		isInstalling,
		showIosInstructions,
		canInstall: Boolean(deferredPrompt),
		install,
		dismiss,
	};
}
