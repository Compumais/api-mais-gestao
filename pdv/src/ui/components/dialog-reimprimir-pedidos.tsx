import { ListaPedidosProducao } from "@/ui/components/lista-pedidos-producao";
import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export function DialogReimprimirPedidos({
	aberto,
	idconta,
	onFechar,
	onMensagem,
}: {
	aberto: boolean;
	idconta?: string;
	onFechar: () => void;
	onMensagem?: (texto: string) => void;
}) {
	useEscapeFechaModal(aberto, onFechar);
	if (!aberto) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-[2px]">
			<div className="pdv-surface flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden ring-slate-950/20">
				<div className="bg-sidebar px-5 py-4 text-sidebar-foreground">
					<h2 className="text-lg font-semibold">Reimprimir pedidos</h2>
					<p className="text-sm text-sidebar-foreground/70">
						Pedidos enviados à produção hoje. A reimpressão respeita o modo
						configurado (por itens ou por pedido).
					</p>
				</div>
				<div className="pdv-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950/30">
					<ListaPedidosProducao idconta={idconta} onMensagem={onMensagem} />
				</div>
				<div className="border-t bg-card px-5 py-3">
					<Button
						variant="outline"
						className="pdv-touch w-full"
						onClick={onFechar}
					>
						Fechar
					</Button>
				</div>
			</div>
		</div>
	);
}
