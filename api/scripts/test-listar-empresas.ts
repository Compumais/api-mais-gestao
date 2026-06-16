import { listarEmpresas } from "../src/repositories/empresa-repositories.js";

const userId = process.argv[2] ?? "UOOqUrwMieEjUXQbjWvUNuDN4xfWH5eA";

async function main() {
	try {
		const result = await listarEmpresas({
			idusuario: userId,
			idproprietario: userId,
		});
		console.log(JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("ERROR:", error);
		process.exit(1);
	}
}

main();
