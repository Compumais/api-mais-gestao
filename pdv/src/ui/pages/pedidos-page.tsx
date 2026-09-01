import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { rotaHomePdv, type StatusContext } from "@/lib/pdv-types";
import { FunctionBar } from "@/ui/components/function-bar";
import { ListaPedidosProducao } from "@/ui/components/lista-pedidos-producao";
import { PdvShell } from "@/ui/components/pdv-shell";
import { Topbar } from "@/ui/components/topbar";
import { useTeclasFuncao } from "@/ui/hooks/use-teclas-funcao";

export function PedidosPage() {
	const navigate = useNavigate();
	const { status } = useOutletContext<StatusContext>();
	const { teclas } = useTeclasFuncao();
	const [msg, setMsg] = useState("");

	return (
		<PdvShell
			status={status}
			onBlockedNavigate={setMsg}
			topbar={
				<Topbar
					title="Pedidos de produção"
					subtitle="Reimprimir cupons enviados à cozinha hoje"
				/>
			}
			footer={
				<FunctionBar
					actions={[
						{
							key: "voltar",
							label: "Voltar",
							hotkey: "Escape",
							variant: "outline",
							onClick: () => navigate(rotaHomePdv(status)),
						},
						{
							key: "historico",
							label: "Vendas",
							hotkey: teclas.historico,
							variant: "secondary",
							onClick: () => navigate("/vendas"),
						},
					]}
				/>
			}
		>
			{msg ? (
				<p className="mb-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
					{msg}
				</p>
			) : null}
			<div className="min-h-0 flex-1 overflow-y-auto">
				<ListaPedidosProducao onMensagem={setMsg} />
			</div>
		</PdvShell>
	);
}
