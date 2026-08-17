import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REGRA_EXE = "PDV Mais Gestao LAN";
const REGRA_TCP = "PDV Mais Gestao LAN TCP";

/** Libera inbound no Windows. Sem admin a chamada falha em silêncio. */
export async function garantirRegraFirewall(porta: number): Promise<void> {
	if (process.platform !== "win32") return;
	const exe = process.execPath;
	await execNetsh([
		"advfirewall",
		"firewall",
		"delete",
		"rule",
		`name=${REGRA_EXE}`,
	]);
	await execNetsh([
		"advfirewall",
		"firewall",
		"delete",
		"rule",
		`name=${REGRA_TCP}`,
	]);
	await execNetsh([
		"advfirewall",
		"firewall",
		"add",
		"rule",
		`name=${REGRA_EXE}`,
		"dir=in",
		"action=allow",
		`program=${exe}`,
		"enable=yes",
		"profile=any",
	]);
	await execNetsh([
		"advfirewall",
		"firewall",
		"add",
		"rule",
		`name=${REGRA_TCP}`,
		"dir=in",
		"action=allow",
		"protocol=TCP",
		`localport=${porta}`,
		"profile=any",
	]);
}

async function execNetsh(args: string[]): Promise<void> {
	await execFileAsync("netsh", args, { windowsHide: true }).catch(
		() => undefined,
	);
}
