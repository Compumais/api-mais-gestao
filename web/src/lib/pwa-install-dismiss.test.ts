import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PWA_DISMISS_DAYS, PWA_DISMISS_STORAGE_KEY } from "../constants/pwa";
import {
	isPwaInstallDismissed,
	markPwaInstallDismissed,
	resetPwaInstallDismissMemoryForTests,
} from "./pwa-install-dismiss";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function createMemoryStorage(shouldThrow = false): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			if (shouldThrow) throw new Error("storage blocked");
			store.clear();
		},
		getItem(key: string) {
			if (shouldThrow) throw new Error("storage blocked");
			return store.get(key) ?? null;
		},
		key(index: number) {
			if (shouldThrow) throw new Error("storage blocked");
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			if (shouldThrow) throw new Error("storage blocked");
			store.delete(key);
		},
		setItem(key: string, value: string) {
			if (shouldThrow) throw new Error("storage blocked");
			store.set(key, value);
		},
	};
}

describe("pwa-install-dismiss", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		resetPwaInstallDismissMemoryForTests();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			writable: true,
			value: {
				localStorage: createMemoryStorage(),
				sessionStorage: createMemoryStorage(),
			},
		});
	});

	afterEach(() => {
		resetPwaInstallDismissMemoryForTests();
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			writable: true,
			value: originalWindow,
		});
	});

	it("retorna false quando nunca foi dispensado ou valor é inválido", () => {
		const now = 1_700_000_000_000;
		expect(isPwaInstallDismissed(now)).toBe(false);

		window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, "invalido");
		expect(isPwaInstallDismissed(now)).toBe(false);
	});

	it("persiste dispensa e respeita a janela de dias configurada", () => {
		const now = 1_700_000_000_000;
		markPwaInstallDismissed(now);

		expect(window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY)).toBe(
			now.toString(),
		);
		expect(isPwaInstallDismissed(now)).toBe(true);
		expect(
			isPwaInstallDismissed(now + (PWA_DISMISS_DAYS - 1) * MS_PER_DAY),
		).toBe(true);
		expect(isPwaInstallDismissed(now + PWA_DISMISS_DAYS * MS_PER_DAY)).toBe(
			false,
		);
	});

	it("mantém dispensa em memória mesmo se localStorage e sessionStorage falharem", () => {
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			writable: true,
			value: {
				localStorage: createMemoryStorage(true),
				sessionStorage: createMemoryStorage(true),
			},
		});

		const now = 1_700_000_000_000;
		markPwaInstallDismissed(now);

		expect(isPwaInstallDismissed(now + 1000)).toBe(true);
		expect(isPwaInstallDismissed(now + PWA_DISMISS_DAYS * MS_PER_DAY)).toBe(
			false,
		);
	});

	it("usa sessionStorage como fallback se localStorage falhar e memória for limpa", () => {
		Object.defineProperty(globalThis, "window", {
			configurable: true,
			writable: true,
			value: {
				localStorage: createMemoryStorage(true),
				sessionStorage: createMemoryStorage(false),
			},
		});

		const now = 1_700_000_000_000;
		markPwaInstallDismissed(now);
		resetPwaInstallDismissMemoryForTests();

		expect(isPwaInstallDismissed(now + 1000)).toBe(true);
	});
});
