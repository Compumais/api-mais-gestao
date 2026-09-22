import assert from "node:assert/strict";
import type { NetworkInterfaceInfo } from "node:os";
import { describe, it } from "node:test";
import { extrairIpsRotaPadraoWindows, filtrarIpsLan } from "./ips";

function ipv4(address: string, internal = false): NetworkInterfaceInfo {
	return {
		address,
		netmask: "255.255.255.0",
		family: "IPv4",
		mac: "00:00:00:00:00:00",
		internal,
		cidr: `${address}/24`,
	};
}

describe("filtrarIpsLan", () => {
	it("mantém apenas interfaces físicas úteis para conexão do POS", () => {
		const ips = filtrarIpsLan(
			{
				Ethernet: [ipv4("192.168.18.4")],
				"Ethernet 2": [ipv4("192.168.56.1")],
				Tailscale: [ipv4("100.67.198.122")],
				"vEthernet (WSL)": [ipv4("172.17.224.1")],
				Loopback: [ipv4("127.0.0.1", true)],
			},
			["192.168.18.4"],
		);

		assert.deepEqual(ips, ["192.168.18.4"]);
	});

	it("remove endereços repetidos e IPv6", () => {
		const ipv6: NetworkInterfaceInfo = {
			address: "fe80::1",
			netmask: "ffff:ffff:ffff:ffff::",
			family: "IPv6",
			mac: "00:00:00:00:00:00",
			internal: false,
			cidr: "fe80::1/64",
			scopeid: 1,
		};

		const ips = filtrarIpsLan({
			Ethernet: [ipv4("192.168.1.10"), ipv6],
			"Wi-Fi": [ipv4("192.168.1.10")],
		});

		assert.deepEqual(ips, ["192.168.1.10"]);
	});

	it("extrai o IP da interface usado pela rota padrão do Windows", () => {
		const saida = `
Destino da rede          Máscara   Endereço gateway       Interface  Custo
          0.0.0.0          0.0.0.0     192.168.18.1     192.168.18.4     25
        127.0.0.0        255.0.0.0         No vínculo         127.0.0.1    331
`;

		assert.deepEqual(extrairIpsRotaPadraoWindows(saida), ["192.168.18.4"]);
	});
});
