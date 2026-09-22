import { execFileSync } from "node:child_process";
import {
	type NetworkInterfaceInfo,
	type NetworkInterfaceInfoIPv4,
	networkInterfaces,
} from "node:os";

const INTERFACE_VIRTUAL =
	/(?:virtualbox|vmware|hyper-v|vethernet|docker|wsl|tailscale|zerotier|hamachi|loopback|bluetooth|npcap|tap|tun)/i;

export function filtrarIpsLan(
	ifaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
	ipsRotaPadrao: string[] = [],
): string[] {
	const ips = new Set<string>();
	for (const [nome, addrs] of Object.entries(ifaces)) {
		if (INTERFACE_VIRTUAL.test(nome)) continue;
		for (const addr of addrs ?? []) {
			const family = String(addr.family);
			if ((family === "IPv4" || family === "4") && !addr.internal) {
				ips.add((addr as NetworkInterfaceInfoIPv4).address);
			}
		}
	}
	const candidatos = [...ips];
	const ipsPrincipais = new Set(ipsRotaPadrao);
	const conectadosPelaRotaPadrao = candidatos.filter((ip) =>
		ipsPrincipais.has(ip),
	);
	return conectadosPelaRotaPadrao.length > 0
		? conectadosPelaRotaPadrao
		: candidatos;
}

export function extrairIpsRotaPadraoWindows(saida: string): string[] {
	const ips = new Set<string>();
	for (const linha of saida.split(/\r?\n/)) {
		const colunas = linha.trim().split(/\s+/);
		if (
			colunas[0] === "0.0.0.0" &&
			colunas[1] === "0.0.0.0" &&
			/^\d{1,3}(?:\.\d{1,3}){3}$/.test(colunas[3] ?? "")
		) {
			ips.add(colunas[3]);
		}
	}
	return [...ips];
}

function listarIpsRotaPadrao(): string[] {
	if (process.platform !== "win32") return [];
	try {
		const saida = execFileSync("route.exe", ["PRINT", "0.0.0.0"], {
			encoding: "utf8",
			timeout: 2_000,
			windowsHide: true,
		});
		return extrairIpsRotaPadraoWindows(saida);
	} catch {
		return [];
	}
}

export function listarIpsLan(): string[] {
	return filtrarIpsLan(networkInterfaces(), listarIpsRotaPadrao());
}
