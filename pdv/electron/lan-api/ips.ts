import { networkInterfaces } from "node:os";

export function listarIpsLan(): string[] {
	const ips: string[] = [];
	const ifaces = networkInterfaces();
	for (const addrs of Object.values(ifaces)) {
		for (const addr of addrs ?? []) {
			const family = String(addr.family);
			if ((family === "IPv4" || family === "4") && !addr.internal) {
				ips.push(addr.address);
			}
		}
	}
	return ips;
}
