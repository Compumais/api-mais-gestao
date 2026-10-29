import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onDeliveryEvent, pdvInvoke } from "@/lib/pdv-api";
import { Button } from "@/ui/components/ui/button";

type Alerta = {
	id: string;
	titulo: string;
	corpo: string;
};

export function AlertaPedidoDelivery() {
	const navigate = useNavigate();
	const [alerta, setAlerta] = useState<Alerta | null>(null);

	useEffect(() => {
		return onDeliveryEvent((payload) => {
			const p = payload as Record<string, unknown>;
			if (p.tipo !== "pedido-novo") return;
			setAlerta({
				id: String(p.id ?? ""),
				titulo: String(p.titulo ?? "Novo pedido"),
				corpo: String(p.corpo ?? "Novo pedido no cardápio"),
			});
		});
	}, []);

	if (!alerta) return null;

	function fechar() {
		setAlerta(null);
	}

	function abrirPedido() {
		const atual = alerta;
		if (!atual) return;
		const destino = atual.id ? `/delivery/${atual.id}` : "/delivery";
		void pdvInvoke("marcarPedidosDeliveryVistos");
		setAlerta(null);
		navigate(destino);
	}

	return (
		<div
			className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-600/50 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-50"
			role="status"
			aria-live="assertive"
		>
			<div className="flex min-w-0 items-start gap-2">
				<Bell
					className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
					aria-hidden
				/>
				<div className="min-w-0">
					<p className="font-semibold">{alerta.titulo}</p>
					<p className="text-xs opacity-90">{alerta.corpo}</p>
				</div>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button type="button" size="sm" onClick={abrirPedido}>
					Abrir pedido
				</Button>
				<Button type="button" size="sm" variant="outline" onClick={fechar}>
					Dispensar
				</Button>
			</div>
		</div>
	);
}
