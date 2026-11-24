"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskCpfCnpj } from "@/lib/masks";
import {
	type ClientePendenteImportacao,
	contratoService,
	type VincularClienteImportacaoResponse,
} from "@/services/contrato.service";
import { entidadesService } from "@/services/entidades.service";

interface ResolverClientesImportacaoProps {
	idempresa: string;
	idtipodocumento: string;
	clientes: ClientePendenteImportacao[];
	totalCriados: number;
	onResolvido: (
		codigocliente: string,
		resultado: VincularClienteImportacaoResponse,
	) => void;
}

function formatarDocumento(codigo: string): string {
	const digitos = codigo.replace(/\D/g, "");
	if (digitos.length === 11 || digitos.length === 14) {
		return maskCpfCnpj(digitos);
	}
	return codigo;
}

function formatarValor(valor: string): string {
	const numero = Number(valor);
	if (Number.isNaN(numero)) return valor;
	return numero.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

export function ResolverClientesImportacao({
	idempresa,
	idtipodocumento,
	clientes,
	totalCriados,
	onResolvido,
}: ResolverClientesImportacaoProps) {
	const queryClient = useQueryClient();
	const [modo, setModo] = useState<
		Record<string, "cadastrar" | "associar" | null>
	>({});
	const [nomes, setNomes] = useState<Record<string, string>>({});
	const [associacoes, setAssociacoes] = useState<Record<string, string>>({});

	const { data: entidades = [], isLoading: carregandoEntidades } = useQuery({
		queryKey: ["entidades-associar-importacao", idempresa],
		enabled: Boolean(idempresa),
		queryFn: () => entidadesService.listarTodos({ idempresa }),
	});

	const opcoesEntidades = entidades.map((entidade) => ({
		value: entidade.id,
		label: `${entidade.razaosocial || entidade.nome}${entidade.cnpjcpf ? ` — ${entidade.cnpjcpf}` : ""}`,
	}));

	const mutation = useMutation({
		mutationFn: contratoService.vincularClienteImportacao,
		onSuccess: async (resultado, variaveis) => {
			await queryClient.invalidateQueries({ queryKey: ["contratos"] });
			await queryClient.invalidateQueries({ queryKey: ["entidades"] });
			await queryClient.invalidateQueries({
				queryKey: ["entidades-associar-importacao", idempresa],
			});
			await queryClient.invalidateQueries({ queryKey: ["tipos-contrato"] });
			await queryClient.invalidateQueries({ queryKey: ["grupos-contrato"] });
			toast.success(
				`${resultado.totalCriados} contrato(s) vinculado(s) a ${resultado.nomeCliente}`,
			);
			onResolvido(variaveis.codigocliente, resultado);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Não foi possível vincular o cliente");
		},
	});

	const codigoProcessando = mutation.isPending
		? mutation.variables?.codigocliente
		: null;

	const abrirAssociar = (cliente: ClientePendenteImportacao) => {
		setModo((atual) => ({ ...atual, [cliente.codigocliente]: "associar" }));
		setAssociacoes((atual) => ({
			...atual,
			[cliente.codigocliente]:
				atual[cliente.codigocliente] || cliente.identidadeSugerida || "",
		}));
	};

	const cadastrar = (cliente: ClientePendenteImportacao) => {
		const nome = nomes[cliente.codigocliente]?.trim() ?? "";
		if (!nome) {
			toast.error("Informe o nome do cliente");
			return;
		}

		mutation.mutate({
			idempresa,
			idtipodocumento,
			acao: "cadastrar",
			codigocliente: cliente.codigocliente,
			nome,
			contratos: cliente.contratos.map((contrato) => ({
				grupocontrato: contrato.grupocontrato,
				tipocontrato: contrato.tipocontrato,
				descricao: contrato.descricao,
				valor: contrato.valor,
				diavencimento: contrato.diavencimento,
			})),
		});
	};

	const associar = (cliente: ClientePendenteImportacao) => {
		const identidade = associacoes[cliente.codigocliente] ?? "";
		if (!identidade) {
			toast.error("Selecione o cadastro para associar");
			return;
		}

		mutation.mutate({
			idempresa,
			idtipodocumento,
			acao: "associar",
			codigocliente: cliente.codigocliente,
			identidade,
			contratos: cliente.contratos.map((contrato) => ({
				grupocontrato: contrato.grupocontrato,
				tipocontrato: contrato.tipocontrato,
				descricao: contrato.descricao,
				valor: contrato.valor,
				diavencimento: contrato.diavencimento,
			})),
		});
	};

	return (
		<div className="flex flex-col gap-3">
			<p className="text-sm text-muted-foreground" aria-live="polite">
				{totalCriados > 0
					? `${totalCriados} contrato(s) já importado(s). `
					: "Nenhum contrato foi criado ainda. "}
				{clientes.length} cliente(s) não estão cadastrados. Cadastre um novo
				cliente ou associe a um cadastro existente para criar os contratos.
			</p>

			<div className="flex max-h-[28rem] flex-col gap-3 overflow-auto pr-1">
				{clientes.map((cliente) => {
					const acao = modo[cliente.codigocliente] ?? null;
					const ocupado = codigoProcessando === cliente.codigocliente;

					return (
						<div
							key={cliente.codigocliente}
							className="rounded-md border p-3 flex flex-col gap-3"
						>
							<div className="flex flex-col gap-1">
								<p className="text-sm font-medium">
									{formatarDocumento(cliente.codigocliente)}
								</p>
								<p className="text-xs text-muted-foreground">
									{cliente.contratos.length} contrato(s):{" "}
									{cliente.contratos
										.map(
											(contrato) =>
												`${contrato.descricao} (${formatarValor(contrato.valor)})`,
										)
										.join("; ")}
								</p>
								{cliente.nomeSugerido && (
									<p className="text-xs text-amber-700 dark:text-amber-400">
										Já existe o cadastro "{cliente.nomeSugerido}", que ainda não
										é cliente. Associe esse cadastro ou escolha outro.
									</p>
								)}
							</div>

							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant={acao === "cadastrar" ? "default" : "outline"}
									disabled={Boolean(codigoProcessando)}
									onClick={() =>
										setModo((atual) => ({
											...atual,
											[cliente.codigocliente]: "cadastrar",
										}))
									}
								>
									Cadastrar
								</Button>
								<Button
									type="button"
									variant={acao === "associar" ? "default" : "outline"}
									disabled={Boolean(codigoProcessando)}
									onClick={() => abrirAssociar(cliente)}
								>
									Associar
								</Button>
							</div>

							{acao === "cadastrar" && (
								<div className="flex flex-col gap-2">
									<Label htmlFor={`nome-${cliente.codigocliente}`}>
										Nome do cliente
									</Label>
									<Input
										id={`nome-${cliente.codigocliente}`}
										value={nomes[cliente.codigocliente] ?? ""}
										placeholder="Nome que será gravado no cadastro"
										onChange={(evento) =>
											setNomes((atual) => ({
												...atual,
												[cliente.codigocliente]: evento.target.value,
											}))
										}
									/>
									<Button
										type="button"
										disabled={ocupado}
										onClick={() => cadastrar(cliente)}
									>
										{ocupado && (
											<Loader2
												className="mr-2 h-4 w-4 animate-spin"
												aria-hidden="true"
											/>
										)}
										Cadastrar e criar contratos
									</Button>
								</div>
							)}

							{acao === "associar" && (
								<div className="flex flex-col gap-2">
									<Label>Cadastro existente</Label>
									<Combobox
										options={opcoesEntidades}
										value={associacoes[cliente.codigocliente] ?? ""}
										onChange={(valor) =>
											setAssociacoes((atual) => ({
												...atual,
												[cliente.codigocliente]: valor,
											}))
										}
										placeholder={
											carregandoEntidades
												? "Carregando cadastros..."
												: "Buscar cadastro..."
										}
										searchPlaceholder="Buscar por nome ou CNPJ/CPF..."
										emptyMessage="Nenhum cadastro encontrado."
										disabled={carregandoEntidades || ocupado}
									/>
									<Button
										type="button"
										disabled={ocupado}
										onClick={() => associar(cliente)}
									>
										{ocupado && (
											<Loader2
												className="mr-2 h-4 w-4 animate-spin"
												aria-hidden="true"
											/>
										)}
										Associar e criar contratos
									</Button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
