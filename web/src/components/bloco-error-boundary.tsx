"use client";

import { AlertTriangle } from "lucide-react";
import {
	Component,
	type ErrorInfo,
	Fragment,
	type ReactNode,
} from "react";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VarianteBlocoErrorBoundary = "compacto" | "painel";

type BlocoErrorBoundaryProps = {
	children: ReactNode;
	titulo: string;
	variante?: VarianteBlocoErrorBoundary;
};

type BlocoErrorBoundaryState = {
	temErro: boolean;
	chaveRemontagem: number;
};

/**
 * Executa `render` no próprio filho para o boundary capturar throws
 * sem exigir prop drilling do estado do pai.
 */
export function BlocoErrorBoundarySlot({
	render,
}: {
	render: () => ReactNode;
}) {
	return <>{render()}</>;
}

export class BlocoErrorBoundary extends Component<
	BlocoErrorBoundaryProps,
	BlocoErrorBoundaryState
> {
	state: BlocoErrorBoundaryState = {
		temErro: false,
		chaveRemontagem: 0,
	};

	static getDerivedStateFromError(): Partial<BlocoErrorBoundaryState> {
		return { temErro: true };
	}

	componentDidCatch(_erro: Error, _info: ErrorInfo) {
		// Sem logging em produção; o fallback visual é suficiente.
	}

	private resetar = () => {
		this.setState((estado) => ({
			temErro: false,
			chaveRemontagem: estado.chaveRemontagem + 1,
		}));
	};

	render() {
		const { children, titulo, variante = "compacto" } = this.props;
		const { temErro, chaveRemontagem } = this.state;

		if (temErro) {
			return (
				<div
					className={cn(
						variante === "painel" && "rounded-lg border bg-card p-4 mx-4 md:p-6",
					)}
				>
					<Alert variant="destructive">
						<AlertTriangle aria-hidden="true" />
						<AlertTitle>{titulo}</AlertTitle>
						<AlertDescription>
							Ocorreu um erro ao exibir este bloco. Você pode tentar novamente
							sem sair da página.
						</AlertDescription>
						<AlertAction>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={this.resetar}
							>
								Tentar novamente
							</Button>
						</AlertAction>
					</Alert>
				</div>
			);
		}

		return <Fragment key={chaveRemontagem}>{children}</Fragment>;
	}
}
