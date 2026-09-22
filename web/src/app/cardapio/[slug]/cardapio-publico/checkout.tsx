"use client";

import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

const TEXTO = "#0a0a0a";
const TEXTO_SEC = "#262626";
const BORDA = "#d4d4d4";
const FUNDO = "#ffffff";

const campoStyle: CSSProperties = {
	color: TEXTO,
	backgroundColor: FUNDO,
	border: `1px solid ${BORDA}`,
	borderRadius: 8,
	width: "100%",
	padding: "10px 12px",
	fontSize: 16,
	fontWeight: 500,
};

const labelStyle: CSSProperties = {
	color: TEXTO,
	fontSize: 14,
	fontWeight: 700,
	display: "block",
	marginBottom: 6,
};

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
		<main
			className="mx-auto max-w-xl px-4 py-6"
			style={{ color: TEXTO, backgroundColor: "#f5f5f5" }}
		>
			<button
				type="button"
				style={{
					color: TEXTO,
					fontSize: 14,
					fontWeight: 700,
					marginBottom: 16,
					textDecoration: "underline",
					background: "none",
					border: 0,
					padding: 0,
					cursor: "pointer",
				}}
				onClick={onVoltar}
			>
				← Voltar ao cardápio
			</button>
			<h1
				style={{
					color: TEXTO,
					fontSize: 28,
					fontWeight: 900,
					letterSpacing: "-0.02em",
					margin: 0,
				}}
			>
				Finalizar pedido
			</h1>
			<ul className="mt-4 space-y-3" style={{ listStyle: "none", padding: 0 }}>
				{sacola.map((item) => (
					<li
						key={item.chave}
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
							gap: 12,
							borderRadius: 12,
							border: `1px solid ${BORDA}`,
							background: FUNDO,
							padding: 12,
							color: TEXTO,
						}}
					>
						<div>
							<p
								style={{
									margin: 0,
									color: TEXTO,
									fontWeight: 800,
									textTransform: "uppercase",
								}}
							>
								{item.nome}
							</p>
							<p
								style={{
									margin: "4px 0 0",
									color: TEXTO_SEC,
									fontSize: 14,
									fontWeight: 600,
								}}
							>
								{item.quantidade} × {formatarMoeda(item.preco)}
							</p>
						</div>
						<button
							type="button"
							style={{
								color: "#b91c1c",
								fontSize: 14,
								fontWeight: 700,
								background: "none",
								border: 0,
								cursor: "pointer",
							}}
							onClick={() => onRemover(item.chave)}
						>
							Remover
						</button>
					</li>
				))}
			</ul>
			<div
				className="mt-6 space-y-4"
				style={{
					borderRadius: 12,
					border: `1px solid ${BORDA}`,
					background: FUNDO,
					padding: 16,
					color: TEXTO,
				}}
			>
				<div>
					<label htmlFor="nome" style={labelStyle}>
						Nome
					</label>
					<input
						id="nome"
						value={nome}
						onChange={(event) => onNome(event.target.value)}
						style={campoStyle}
						autoComplete="name"
						required
					/>
				</div>
				<div>
					<label htmlFor="telefone" style={labelStyle}>
						Telefone (WhatsApp)
					</label>
					<input
						id="telefone"
						type="tel"
						inputMode="tel"
						value={telefone}
						onChange={(event) => onTelefone(event.target.value)}
						placeholder="(00) 00000-0000"
						style={campoStyle}
						autoComplete="tel"
						required
					/>
					<p
						style={{
							margin: "6px 0 0",
							color: TEXTO_SEC,
							fontSize: 12,
							fontWeight: 600,
						}}
					>
						Usaremos este número para contato e integração com WhatsApp.
					</p>
				</div>
				{[...data.camposfinalizacao]
					.sort((a, b) => a.ordem - b.ordem)
					.map((campo) => {
						if (
							campo.condicao &&
							(respostas[campo.condicao.campoid] ?? "") !== campo.condicao.valor
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
								<div key={campo.id}>
									<span style={labelStyle}>{campo.rotulo}</span>
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
										<SelectTrigger
											className="h-11 w-full"
											style={{ ...campoStyle, height: 44 }}
										>
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
									<div>
										<label htmlFor="endereco" style={labelStyle}>
											Endereço
										</label>
										<input
											id="endereco"
											value={respostas.endereco ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													endereco: event.target.value,
												}))
											}
											style={campoStyle}
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label htmlFor="numero" style={labelStyle}>
												Número
											</label>
											<input
												id="numero"
												value={respostas.numero ?? ""}
												onChange={(event) =>
													onRespostas((atual) => ({
														...atual,
														numero: event.target.value,
													}))
												}
												style={campoStyle}
											/>
										</div>
										<div>
											<span style={labelStyle}>Bairro</span>
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
													<SelectTrigger
														className="h-11 w-full"
														style={{ ...campoStyle, height: 44 }}
													>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent>
														{data.bairrosentrega.map((bairro) => (
															<SelectItem key={bairro.nome} value={bairro.nome}>
																{bairro.nome} · {formatarMoeda(bairro.taxa)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<input
													value={respostas.bairro ?? ""}
													onChange={(event) =>
														onRespostas((atual) => ({
															...atual,
															bairro: event.target.value,
														}))
													}
													style={campoStyle}
												/>
											)}
										</div>
									</div>
									<div>
										<label htmlFor="complemento" style={labelStyle}>
											Complemento
										</label>
										<input
											id="complemento"
											value={respostas.complemento ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													complemento: event.target.value,
												}))
											}
											style={campoStyle}
										/>
									</div>
									<div>
										<label htmlFor="referencia" style={labelStyle}>
											Referência
										</label>
										<input
											id="referencia"
											value={respostas.referencia ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													referencia: event.target.value,
												}))
											}
											style={campoStyle}
										/>
									</div>
								</div>
							);
						}
						if (campo.tipo === "pagamento") {
							return (
								<div key={campo.id}>
									<span style={labelStyle}>{campo.rotulo}</span>
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
										<SelectTrigger
											className="h-11 w-full"
											style={{ ...campoStyle, height: 44 }}
										>
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
								<div key={campo.id}>
									<label htmlFor={campo.id} style={labelStyle}>
										{campo.rotulo}
									</label>
									<textarea
										id={campo.id}
										value={respostas[campo.id] ?? ""}
										onChange={(event) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: event.target.value,
												observacao: event.target.value,
											}))
										}
										rows={3}
										style={{ ...campoStyle, resize: "vertical" }}
									/>
								</div>
							);
						}
						if (campo.tipo === "select") {
							return (
								<div key={campo.id}>
									<span style={labelStyle}>{campo.rotulo}</span>
									<Select
										value={respostas[campo.id] ?? ""}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
											}))
										}
									>
										<SelectTrigger
											className="h-11 w-full"
											style={{ ...campoStyle, height: 44 }}
										>
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
							<div key={campo.id}>
								<label htmlFor={campo.id} style={labelStyle}>
									{campo.rotulo}
								</label>
								<input
									id={campo.id}
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
									style={campoStyle}
								/>
							</div>
						);
					})}
				{data.mensagemrodape ? (
					<p style={{ color: TEXTO_SEC, fontSize: 14, fontWeight: 600 }}>
						{data.mensagemrodape}
					</p>
				) : null}
			</div>
			<div
				className="mt-4"
				style={{
					borderRadius: 12,
					border: `1px solid ${BORDA}`,
					background: FUNDO,
					padding: 16,
					color: TEXTO,
					fontSize: 14,
					fontWeight: 600,
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						color: TEXTO,
					}}
				>
					<span>Subtotal</span>
					<span>{formatarMoeda(subtotal)}</span>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginTop: 4,
						color: TEXTO,
					}}
				>
					<span>Entrega</span>
					<span>{formatarMoeda(taxa)}</span>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						marginTop: 8,
						color: TEXTO,
						fontSize: 16,
						fontWeight: 800,
					}}
				>
					<span>Total</span>
					<span>{formatarMoeda(total)}</span>
				</div>
			</div>
			<Button
				className="mt-4 w-full"
				style={{
					backgroundColor: "#0a0a0a",
					color: "#ffffff",
					fontWeight: 700,
					height: 48,
				}}
				disabled={enviando || sacola.length === 0}
				onClick={onEnviar}
			>
				{enviando ? "Enviando..." : `Enviar pedido · ${formatarMoeda(total)}`}
			</Button>
		</main>
	);
}
