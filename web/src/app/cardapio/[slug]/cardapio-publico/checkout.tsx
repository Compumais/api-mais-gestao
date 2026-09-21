"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CardapioPublico } from "@/services/cardapio-publico.service";
import { formatarMoeda, type ItemSacola } from "./tipos";

type Props = {
	data: CardapioPublico;
	sacola: ItemSacola[];
	nome: string;
	telefone: string;
	respostas: Record<string, string>;
	subtotal: number;
	taxa: number;
	total: number;
	enviando: boolean;
	onVoltar: () => void;
	onNome: (valor: string) => void;
	onTelefone: (valor: string) => void;
	onRespostas: (
		atualizador:
			| Record<string, string>
			| ((atual: Record<string, string>) => Record<string, string>),
	) => void;
	onRemover: (chave: string) => void;
	onEnviar: () => void;
};

const campoClass =
	"border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500";
const labelClass = "text-sm font-semibold text-neutral-950";

export function CardapioPublicoCheckout({
	data,
	sacola,
	nome,
	telefone,
	respostas,
	subtotal,
	taxa,
	total,
	enviando,
	onVoltar,
	onNome,
	onTelefone,
	onRespostas,
	onRemover,
	onEnviar,
}: Props) {
	return (
		<main className="mx-auto max-w-xl px-4 py-6 text-neutral-950">
			<button
				type="button"
				className="mb-4 text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline"
				onClick={onVoltar}
			>
				← Voltar ao cardápio
			</button>
			<h1 className="text-2xl font-black tracking-tight">Finalizar pedido</h1>
			<ul className="mt-4 space-y-3">
				{sacola.map((item) => (
					<li
						key={item.chave}
						className="flex items-start justify-between rounded-xl border border-neutral-200 bg-white p-3"
					>
						<div>
							<p className="font-bold uppercase">{item.nome}</p>
							<p className="text-sm font-medium text-neutral-700">
								{item.quantidade} × {formatarMoeda(item.preco)}
							</p>
						</div>
						<button
							type="button"
							className="text-sm font-semibold text-red-700"
							onClick={() => onRemover(item.chave)}
						>
							Remover
						</button>
					</li>
				))}
			</ul>
			<div className="mt-6 space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
				<div className="space-y-1.5">
					<Label htmlFor="nome" className={labelClass}>
						Nome
					</Label>
					<Input
						id="nome"
						value={nome}
						onChange={(event) => onNome(event.target.value)}
						className={campoClass}
						autoComplete="name"
						required
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="telefone" className={labelClass}>
						Telefone (WhatsApp)
					</Label>
					<Input
						id="telefone"
						type="tel"
						inputMode="tel"
						value={telefone}
						onChange={(event) => onTelefone(event.target.value)}
						placeholder="(00) 00000-0000"
						className={campoClass}
						autoComplete="tel"
						required
					/>
					<p className="text-xs font-medium text-neutral-600">
						Usaremos este número para contato e integração com WhatsApp.
					</p>
				</div>
				{[...data.camposfinalizacao]
					.sort((a, b) => a.ordem - b.ordem)
					.map((campo) => {
						if (
							campo.condicao &&
							(respostas[campo.condicao.campoid] ?? "") !==
								campo.condicao.valor
						) {
							return null;
						}
						if (campo.tipo === "modalidade") {
							const opcoes = [
								data.habilitadelivery === 1
									? { id: "delivery", label: "Entrega" }
									: null,
								data.habilitaretirada === 1
									? { id: "retirada", label: "Retirada" }
									: null,
							].filter(Boolean) as Array<{ id: string; label: string }>;
							return (
								<div key={campo.id} className="space-y-1.5">
									<Label className={labelClass}>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] || opcoes[0]?.id}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
												modalidade: value,
											}))
										}
									>
										<SelectTrigger className={campoClass}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{opcoes.map((opcao) => (
												<SelectItem key={opcao.id} value={opcao.id}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (campo.tipo === "endereco") {
							return (
								<div key={campo.id} className="grid gap-3">
									<div className="space-y-1.5">
										<Label className={labelClass}>Endereço</Label>
										<Input
											value={respostas.endereco ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													endereco: event.target.value,
												}))
											}
											className={campoClass}
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<Label className={labelClass}>Número</Label>
											<Input
												value={respostas.numero ?? ""}
												onChange={(event) =>
													onRespostas((atual) => ({
														...atual,
														numero: event.target.value,
													}))
												}
												className={campoClass}
											/>
										</div>
										<div className="space-y-1.5">
											<Label className={labelClass}>Bairro</Label>
											{data.bairrosentrega.length ? (
												<Select
													value={respostas.bairro ?? ""}
													onValueChange={(value) =>
														onRespostas((atual) => ({
															...atual,
															bairro: value,
														}))
													}
												>
													<SelectTrigger className={campoClass}>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent>
														{data.bairrosentrega.map((bairro) => (
															<SelectItem
																key={bairro.nome}
																value={bairro.nome}
															>
																{bairro.nome} · {formatarMoeda(bairro.taxa)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<Input
													value={respostas.bairro ?? ""}
													onChange={(event) =>
														onRespostas((atual) => ({
															...atual,
															bairro: event.target.value,
														}))
													}
													className={campoClass}
												/>
											)}
										</div>
									</div>
									<div className="space-y-1.5">
										<Label className={labelClass}>Complemento</Label>
										<Input
											value={respostas.complemento ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													complemento: event.target.value,
												}))
											}
											className={campoClass}
										/>
									</div>
									<div className="space-y-1.5">
										<Label className={labelClass}>Referência</Label>
										<Input
											value={respostas.referencia ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													referencia: event.target.value,
												}))
											}
											className={campoClass}
										/>
									</div>
								</div>
							);
						}
						if (campo.tipo === "pagamento") {
							return (
								<div key={campo.id} className="space-y-1.5">
									<Label className={labelClass}>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] ?? ""}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
												pagamento: value,
											}))
										}
									>
										<SelectTrigger className={campoClass}>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{data.meiospagamento.map((meio) => (
												<SelectItem key={meio.id} value={meio.id}>
													{meio.descricao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (campo.tipo === "observacao") {
							return (
								<div key={campo.id} className="space-y-1.5">
									<Label className={labelClass}>{campo.rotulo}</Label>
									<Textarea
										value={respostas[campo.id] ?? ""}
										onChange={(event) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: event.target.value,
												observacao: event.target.value,
											}))
										}
										className={campoClass}
									/>
								</div>
							);
						}
						if (campo.tipo === "select") {
							return (
								<div key={campo.id} className="space-y-1.5">
									<Label className={labelClass}>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] ?? ""}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
											}))
										}
									>
										<SelectTrigger className={campoClass}>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{(campo.opcoes ?? []).map((opcao) => (
												<SelectItem key={opcao} value={opcao}>
													{opcao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						return (
							<div key={campo.id} className="space-y-1.5">
								<Label className={labelClass}>{campo.rotulo}</Label>
								<Input
									value={respostas[campo.id] ?? ""}
									onChange={(event) =>
										onRespostas((atual) => ({
											...atual,
											[campo.id]: event.target.value,
											...(campo.tipo === "documento"
												? { documento: event.target.value }
												: {}),
										}))
									}
									className={campoClass}
								/>
							</div>
						);
					})}
				{data.mensagemrodape ? (
					<p className="text-sm font-medium text-neutral-700">
						{data.mensagemrodape}
					</p>
				) : null}
			</div>
			<div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm font-medium">
				<div className="flex justify-between text-neutral-800">
					<span>Subtotal</span>
					<span>{formatarMoeda(subtotal)}</span>
				</div>
				<div className="mt-1 flex justify-between text-neutral-800">
					<span>Entrega</span>
					<span>{formatarMoeda(taxa)}</span>
				</div>
				<div className="mt-2 flex justify-between text-base font-bold text-neutral-950">
					<span>Total</span>
					<span>{formatarMoeda(total)}</span>
				</div>
			</div>
			<Button
				className="mt-4 w-full bg-neutral-950 text-white hover:bg-neutral-800"
				disabled={enviando || sacola.length === 0}
				onClick={onEnviar}
			>
				{enviando ? "Enviando..." : `Enviar pedido · ${formatarMoeda(total)}`}
			</Button>
		</main>
	);
}
