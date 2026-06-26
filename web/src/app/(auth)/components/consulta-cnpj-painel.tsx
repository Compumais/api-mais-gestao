import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ConsultaCnpjEntidadeResposta } from "@/services/entidades.service";

type ConsultaCnpjPainelProps = {
	extras: ConsultaCnpjEntidadeResposta["extras"];
	jaCadastrada?: { id: string } | null;
};

function obterVarianteSituacao(situacao: string): "default" | "secondary" | "destructive" {
	const normalizada = situacao.trim().toLowerCase();

	if (normalizada === "ativa") {
		return "default";
	}

	if (
		normalizada.includes("inapta") ||
		normalizada.includes("baixada") ||
		normalizada.includes("nula") ||
		normalizada.includes("suspensa")
	) {
		return "destructive";
	}

	return "secondary";
}

function formatarOpcaoSimples(opcao: string | null): string {
	if (!opcao) return "Não informado";
	return opcao.toUpperCase() === "S" ? "Sim" : "Não";
}

export function ConsultaCnpjPainel({
	extras,
	jaCadastrada,
}: ConsultaCnpjPainelProps) {
	return (
		<Card
			className="md:col-span-2"
			aria-live="polite"
			aria-label="Dados complementares da consulta CNPJ"
		>
			<CardHeader className="pb-3">
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle className="text-base">Dados da Receita Federal</CardTitle>
					<Badge variant={obterVarianteSituacao(extras.situacaoCadastral)}>
						{extras.situacaoCadastral}
					</Badge>
					{jaCadastrada ? (
						<Badge variant="secondary">Já cadastrado na empresa</Badge>
					) : null}
				</div>
				<CardDescription>
					Informações obtidas na consulta do CNPJ
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{extras.dataInicioAtividades ? (
						<div>
							<p className="text-muted-foreground">Início das atividades</p>
							<p>{extras.dataInicioAtividades}</p>
						</div>
					) : null}
					{extras.naturezaJuridica ? (
						<div>
							<p className="text-muted-foreground">Natureza jurídica</p>
							<p>{extras.naturezaJuridica}</p>
						</div>
					) : null}
					<div>
						<p className="text-muted-foreground">Simples Nacional</p>
						<p>{formatarOpcaoSimples(extras.opcaoSimples)}</p>
					</div>
					<div>
						<p className="text-muted-foreground">MEI</p>
						<p>{formatarOpcaoSimples(extras.opcaoMei)}</p>
					</div>
				</div>

				{extras.cnaes.length > 0 ? (
					<div>
						<p className="font-medium mb-2">CNAEs</p>
						<ul className="space-y-1">
							{extras.cnaes.map((cnae) => (
								<li
									key={cnae.cnae}
									className="text-muted-foreground"
								>
									<span className="font-mono text-foreground">{cnae.cnae}</span>
									{" — "}
									{cnae.descricao}
								</li>
							))}
						</ul>
					</div>
				) : null}

				{extras.socios.length > 0 ? (
					<div>
						<p className="font-medium mb-2">Sócios</p>
						<ul className="space-y-2">
							{extras.socios.map((socio) => (
								<li
									key={`${socio.nomeSocio}-${socio.dataEntradaSociedade ?? ""}`}
									className={cn(
										"rounded-md border px-3 py-2",
										"text-muted-foreground",
									)}
								>
									<p className="text-foreground font-medium">{socio.nomeSocio}</p>
									<p>{socio.descricao}</p>
									{socio.dataEntradaSociedade ? (
										<p>Entrada: {socio.dataEntradaSociedade}</p>
									) : null}
								</li>
							))}
						</ul>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
