"use client";

import { useCallback, useEffect, useState } from "react";
import { PWA_DISMISS_DAYS, PWA_DISMISS_STORAGE_KEY } from "@/constants/pwa";

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

function isDismissedRecently() {
	try {
		const raw = localStorage.getItem(PWA_DISMISS_STORAGE_KEY);
		if (!raw) return false;

		const dismissedAt = Number.parseInt(raw, 10);
		if (Number.isNaN(dismissedAt)) return false;

		const expiresAt = dismissedAt + PWA_DISMISS_DAYS * 24 * 60 * 60 * 1000;
		return Date.now() < expiresAt;
	} catch {
		return false;
	}
}

export function usePwaInstall() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [showIosInstructions, setShowIosInstructions] = useState(false);

	useEffect(() => {
		if (isStandaloneMode() || isDismissedRecently()) {
			return;
		}

		if (isIosSafari()) {
			setShowIosInstructions(true);
			setIsVisible(true);
			return;
		}

		const handleBeforeInstallPrompt = (event: Event) => {
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

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt,
			);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const dismiss = useCallback(() => {
		try {
			localStorage.setItem(PWA_DISMISS_STORAGE_KEY, Date.now().toString());
		} catch {
			// ignore storage errors
		}
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
			}
		} finally {
			setDeferredPrompt(null);
			setIsInstalling(false);
		}
	}, [deferredPrompt]);

	return {
		isVisible,
		isInstalling,
		showIosInstructions,
		canInstall: Boolean(deferredPrompt),
		install,
		dismiss,
	};
}
