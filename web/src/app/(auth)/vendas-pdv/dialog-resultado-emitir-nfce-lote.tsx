"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { ResultadoEmitirNfceVendasNaoFiscaisLote } from "@/services/nfce.service";

type DialogResultadoEmitirNfceLoteProps = {
	open: boolean;
	onClose: () => void;
	resultado: ResultadoEmitirNfceVendasNaoFiscaisLote | null;
	onConsultarNota?: (idnotafiscal: string) => void;
};

export function DialogResultadoEmitirNfceLote({
	open,
	onClose,
	resultado,
	onConsultarNota,
}: DialogResultadoEmitirNfceLoteProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(aberto) => {
				if (!aberto) onClose();
			}}
		>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Resultado da emissão em lote</DialogTitle>
					<DialogDescription>
						{resultado
							? `${resultado.autorizadas} autorizada(s) · ${resultado.falhas} falha(s) · ${resultado.ignoradas} ignorada(s) · ${resultado.total} no total`
							: "Sem resultado"}
					</DialogDescription>
				</DialogHeader>

				{resultado ? (
					<div className="max-h-[50vh] overflow-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Venda</TableHead>
									<TableHead>NFC-e</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Mensagem</TableHead>
									<TableHead className="text-right">Ação</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{resultado.itens.map((item) => (
									<TableRow key={item.idvenda}>
										<TableCell className="font-mono text-xs">
											{item.idvenda.slice(0, 8)}…
										</TableCell>
										<TableCell className="tabular-nums">
											{item.numeronotafiscal
												? item.serie
													? `${item.numeronotafiscal}/${item.serie}`
													: item.numeronotafiscal
												: "—"}
										</TableCell>
										<TableCell>
											{item.sucesso
												? "Autorizada"
												: item.ignorada
													? "Ignorada"
													: "Falha"}
										</TableCell>
										<TableCell className="max-w-[240px] text-sm">
											{item.mensagem}
											{item.cStat ? ` (cStat ${item.cStat})` : ""}
										</TableCell>
										<TableCell className="text-right">
											{item.idnotafiscal && onConsultarNota ? (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onConsultarNota(item.idnotafiscal!)}
												>
													Consultar
												</Button>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
