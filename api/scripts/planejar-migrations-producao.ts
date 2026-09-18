export const PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO =
	"0102_notafiscalitem_campos_fiscais_finalizacao";

export type MigrationPlanejavel = {
	tag: string;
	hash: string;
};

export type PlanoMigrationsProducao<T extends MigrationPlanejavel> = {
	baseline: T[];
	pendentes: T[];
};

export function planejarMigrationsProducao<T extends MigrationPlanejavel>(
	migrations: T[],
	hashesAplicados: ReadonlySet<string>,
	bancoExistente: boolean,
): PlanoMigrationsProducao<T> {
	const indicePrimeiraAplicavel = migrations.findIndex(
		(migration) => migration.tag === PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO,
	);

	if (indicePrimeiraAplicavel < 0) {
		throw new Error(
			`Migration de corte ${PRIMEIRA_MIGRATION_APLICAVEL_PRODUCAO} não encontrada no journal`,
		);
	}

	const ausentes = migrations.filter(
		(migration) => !hashesAplicados.has(migration.hash),
	);

	if (!bancoExistente) {
		return { baseline: [], pendentes: ausentes };
	}

	const tagsHistoricas = new Set(
		migrations
			.slice(0, indicePrimeiraAplicavel)
			.map((migration) => migration.tag),
	);
	const baseline = ausentes.filter((migration) =>
		tagsHistoricas.has(migration.tag),
	);
	const hashesBaseline = new Set(baseline.map((migration) => migration.hash));

	return {
		baseline,
		pendentes: ausentes.filter(
			(migration) => !hashesBaseline.has(migration.hash),
		),
	};
}
