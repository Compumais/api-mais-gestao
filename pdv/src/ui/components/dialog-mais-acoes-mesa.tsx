import { Button } from "@/ui/components/ui/button";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export type AcaoSecundariaMesa = {
	key: string;
	label: string;
	hotkey?: string;
	disabled?: boolean;
	variant?: "outline" | "secondary" | "destructive";
	onClick: () => void;
};

export function DialogMaisAcoesMesa({
	aberto,
	onFechar,
	acoes,
}: {
	aberto: boolean;
	onFechar: () => void;
	acoes: AcaoSecundariaMesa[];
}) {
	useEscapeFechaModal(aberto, onFechar);

	if (!aberto) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
			<div className="pdv-surface w-[28rem] max-w-[95vw] space-y-3 p-5">
				<div>
					<h2 className="text-lg font-semibold">Mais ações</h2>
					<p className="text-sm text-muted-foreground">
						Atalhos da barra inferior continuam valendo.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{acoes.map((acao) => (
						<Button
							key={acao.key}
							type="button"
							size="lg"
							variant={acao.variant ?? "outline"}
							className="h-auto min-h-12 w-full flex-col gap-0.5 whitespace-normal py-2"
							disabled={acao.disabled}
							onClick={() => {
								onFechar();
								acao.onClick();
							}}
						>
							{acao.hotkey ? (
								<span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
									{acao.hotkey}
								</span>
							) : null}
							<span>{acao.label}</span>
						</Button>
					))}
				</div>
				<Button
					type="button"
					variant="secondary"
					className="w-full"
					onClick={onFechar}
				>
					Fechar
				</Button>
			</div>
		</div>
	);
}
