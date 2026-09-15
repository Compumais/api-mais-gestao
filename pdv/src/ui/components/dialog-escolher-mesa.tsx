import { useMemo, useState } from "react";
import type { MesaResumo } from "@/lib/pdv-types";
import { money } from "@/lib/utils";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export function DialogEscolherMesa({
	aberto,
	titulo,
	mesas,
	excluirNumero,
	apenasOcupadas,
	loading = false,
	onCancelar,
	onConfirmar,
}: {
	aberto: boolean;
	titulo: string;
	mesas: MesaResumo[];
	excluirNumero?: number;
	apenasOcupadas?: boolean;
	loading?: boolean;
	onCancelar: () => void;
	onConfirmar: (numero: number) => void;
}) {
	const [numero, setNumero] = useState("");
	useEscapeFechaModal(aberto, onCancelar);
	const opcoes = useMemo(() => {
		return mesas.filter((m) => {
			if (m.numero === excluirNumero) return false;
			if (apenasOcupadas) return m.status === "ocupada";
			return true;
		});
	}, [mesas, excluirNumero, apenasOcupadas]);
	if (!aberto) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="pdv-surface w-[28rem] max-w-[95vw] space-y-4 p-5">
				<h2 className="text-lg font-semibold">{titulo}</h2>
				<Input
					type="number"
					min={1}
					placeholder="Número"
					value={numero}
					onChange={(e) => setNumero(e.target.value)}
				/>
				<div className="grid max-h-48 grid-cols-4 gap-2 overflow-auto">
					{opcoes.slice(0, 40).map((m) => (
						<button
							key={m.numero}
							type="button"
							onClick={() => setNumero(String(m.numero))}
							className="rounded-md border px-2 py-2 text-sm hover:border-primary"
						>
							<div className="font-semibold">{m.numero}</div>
							<div className="text-[10px] text-muted-foreground">
								{m.status === "ocupada" ? money(m.valortotal) : "Livre"}
							</div>
						</button>
					))}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" className="flex-1" onClick={onCancelar}>
						Cancelar
					</Button>
					<Button
						className="flex-1"
						disabled={loading || !Number(numero)}
						onClick={() => onConfirmar(Number(numero))}
					>
						Confirmar
					</Button>
				</div>
			</div>
		</div>
	);
}
