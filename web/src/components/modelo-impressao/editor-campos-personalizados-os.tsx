"use client";

import { Plus, Trash2 } from "lucide-react";
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
import {
	LABELS_CAMPO_PERSONALIZADO_OS,
	OPCOES_COLUNA_BLOCO,
} from "@/constants/modelo-impressao-os";
import type {
	CampoPersonalizadoOs,
	ColunaBlocoModeloImpressao,
	TipoCampoPersonalizadoOs,
} from "@/schemas/modelo-impressao-os.schema";
import { TIPOS_CAMPO_PERSONALIZADO_OS } from "@/schemas/modelo-impressao-os.schema";

type EditorCamposPersonalizadosOsProps = {
	tituloSecao?: string;
	campos: CampoPersonalizadoOs[];
	onTituloSecaoChange: (valor: string) => void;
	onCamposChange: (campos: CampoPersonalizadoOs[]) => void;
};

function novoCampoPersonalizado(): CampoPersonalizadoOs {
	return {
		id: crypto.randomUUID(),
		tipo: "textoFixo",
		rotulo: "",
		valor: "",
		coluna: "cheia",
	};
}

export function EditorCamposPersonalizadosOs({
	tituloSecao = "",
	campos,
	onTituloSecaoChange,
	onCamposChange,
}: EditorCamposPersonalizadosOsProps) {
	function atualizarCampo(id: string, patch: Partial<CampoPersonalizadoOs>) {
		onCamposChange(
			campos.map((campo) =>
				campo.id === id ? { ...campo, ...patch } : campo,
			),
		);
	}

	function removerCampo(id: string) {
		onCamposChange(campos.filter((campo) => campo.id !== id));
	}

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<Label htmlFor="titulo-secao-personalizado">Título da seção</Label>
				<Input
					id="titulo-secao-personalizado"
					value={tituloSecao}
					onChange={(e) => onTituloSecaoChange(e.target.value)}
					placeholder="Opcional"
				/>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label>Campos personalizados</Label>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-1.5"
						onClick={() => onCamposChange([...campos, novoCampoPersonalizado()])}
					>
						<Plus className="h-3.5 w-3.5" aria-hidden="true" />
						Adicionar campo
					</Button>
				</div>

				{campos.length === 0 ? (
					<p className="text-sm text-muted-foreground py-2">
						Nenhum campo adicionado. Use o botão acima para criar campos de
						assinatura, data, observação, texto fixo ou status.
					</p>
				) : (
					<div className="space-y-3">
						{campos.map((campo, index) => (
							<div
								key={campo.id}
								className="rounded-md border p-3 space-y-2 bg-muted/20"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs font-medium text-muted-foreground">
										Campo {index + 1}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										aria-label={`Remover campo ${index + 1}`}
										onClick={() => removerCampo(campo.id)}
									>
										<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
									</Button>
								</div>

								<div className="grid gap-2 sm:grid-cols-2">
									<div className="space-y-1">
										<Label>Tipo</Label>
										<Select
											value={campo.tipo}
											onValueChange={(v) =>
												atualizarCampo(campo.id, {
													tipo: v as TipoCampoPersonalizadoOs,
													valor:
														v === "textoFixo" || v === "observacao"
															? campo.valor
															: undefined,
												})
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{TIPOS_CAMPO_PERSONALIZADO_OS.map((tipo) => (
													<SelectItem key={tipo} value={tipo}>
														{LABELS_CAMPO_PERSONALIZADO_OS[tipo]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-1">
										<Label>Coluna</Label>
										<Select
											value={campo.coluna}
											onValueChange={(v) =>
												atualizarCampo(campo.id, {
													coluna: v as ColunaBlocoModeloImpressao,
												})
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{OPCOES_COLUNA_BLOCO.map((opcao) => (
													<SelectItem key={opcao.value} value={opcao.value}>
														{opcao.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="space-y-1">
									<Label>Rótulo</Label>
									<Input
										value={campo.rotulo}
										onChange={(e) =>
											atualizarCampo(campo.id, { rotulo: e.target.value })
										}
										placeholder="Ex.: Assinatura do cliente"
									/>
								</div>

								{(campo.tipo === "textoFixo" || campo.tipo === "observacao") && (
									<div className="space-y-1">
										<Label>
											{campo.tipo === "textoFixo" ? "Texto" : "Observação"}
										</Label>
										{campo.tipo === "textoFixo" ? (
											<Input
												value={campo.valor ?? ""}
												onChange={(e) =>
													atualizarCampo(campo.id, { valor: e.target.value })
												}
												placeholder="Texto fixo a imprimir"
											/>
										) : (
											<Textarea
												rows={3}
												value={campo.valor ?? ""}
												onChange={(e) =>
													atualizarCampo(campo.id, { valor: e.target.value })
												}
												placeholder="Texto da observação (opcional)"
											/>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
