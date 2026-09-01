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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-3 rounded-lg border bg-card p-5">
				<div>
					<h2 className="text-lg font-semibold">Reimprimir pedidos</h2>
					<p className="text-sm text-muted-foreground">
						Pedidos enviados à produção hoje. A reimpressão respeita o modo
						configurado (por itens ou por pedido).
					</p>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					<ListaPedidosProducao idconta={idconta} onMensagem={onMensagem} />
				</div>
				<Button variant="outline" onClick={onFechar}>
					Fechar
				</Button>
			</div>
		</div>
	);
}
