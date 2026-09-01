import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { useEscapeFechaModal } from "@/ui/hooks/use-escape-fecha-modal";

export function DialogSenhaGerencial({
	aberto,
	titulo = "Senha gerencial",
	subtitulo = "Informe a senha para aplicar o desconto.",
	loading = false,
	onCancelar,
	onConfirmar,
	children,
}: {
	aberto: boolean;
	titulo?: string;
	subtitulo?: string;
	loading?: boolean;
	onCancelar: () => void;
	onConfirmar: (senha: string) => void;
	children?: ReactNode;
}) {
	const [senha, setSenha] = useState("");
	useEscapeFechaModal(aberto, onCancelar);
	useEffect(() => {
		if (aberto) setSenha("");
	}, [aberto]);
	if (!aberto) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<form
				className="pdv-surface w-96 space-y-4 p-5"
				onSubmit={(e) => {
					e.preventDefault();
					onConfirmar(senha);
				}}
			>
				<h2 className="text-lg font-semibold">{titulo}</h2>
				<p className="text-sm text-muted-foreground">{subtitulo}</p>
				{children}
				<Input
					type="password"
					autoFocus
					value={senha}
					onChange={(e) => setSenha(e.target.value)}
					placeholder="Senha"
				/>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						onClick={onCancelar}
					>
						Cancelar
					</Button>
					<Button type="submit" className="flex-1" disabled={loading || !senha}>
						Confirmar
					</Button>
				</div>
			</form>
		</div>
	);
}
