import { PWA_DISMISS_DAYS, PWA_DISMISS_STORAGE_KEY } from "../constants/pwa";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

let dismissedAtInMemory: number | null = null;

function isTimestampActive(timestamp: number | null, now: number): boolean {
	if (timestamp === null || Number.isNaN(timestamp)) {
		return false;
	}

	const expiresAt = timestamp + PWA_DISMISS_DAYS * MS_PER_DAY;
	return now < expiresAt;
}

function readTimestampFromStorage(storage: Storage | undefined): number | null {
	if (!storage) return null;

	try {
		const raw = storage.getItem(PWA_DISMISS_STORAGE_KEY);
		if (!raw) return null;

		const parsed = Number.parseInt(raw, 10);
		return Number.isNaN(parsed) ? null : parsed;
	} catch {
		return null;
	}
}

function writeTimestampToStorage(
	storage: Storage | undefined,
	timestamp: number,
): void {
	if (!storage) return;

	try {
		storage.setItem(PWA_DISMISS_STORAGE_KEY, timestamp.toString());
	} catch {
		// ignore storage errors (e.g. private mode or quota exceeded)
	}
}

function getLocalStorage(): Storage | undefined {
	if (typeof window === "undefined") return undefined;
	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}

function getSessionStorage(): Storage | undefined {
	if (typeof window === "undefined") return undefined;
	try {
		return window.sessionStorage;
	} catch {
		return undefined;
	}
}

export function isPwaInstallDismissed(now = Date.now()): boolean {
	if (isTimestampActive(dismissedAtInMemory, now)) {
		return true;
	}

	const localTs = readTimestampFromStorage(getLocalStorage());
	if (isTimestampActive(localTs, now)) {
		return true;
	}

	const sessionTs = readTimestampFromStorage(getSessionStorage());
	if (isTimestampActive(sessionTs, now)) {
		return true;
	}

	return false;
}

export function markPwaInstallDismissed(now = Date.now()): void {
	dismissedAtInMemory = now;
	writeTimestampToStorage(getLocalStorage(), now);
	writeTimestampToStorage(getSessionStorage(), now);
}

export function resetPwaInstallDismissMemoryForTests(): void {
	dismissedAtInMemory = null;
}
