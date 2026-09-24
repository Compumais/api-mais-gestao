"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component } from "react";
import { Button } from "@/components/ui/button";

type VisualErrorBoundaryProps = {
	children: React.ReactNode;
	className?: string;
};

type VisualErrorBoundaryState = {
	failed: boolean;
};

export class VisualErrorBoundary extends Component<
	VisualErrorBoundaryProps,
	VisualErrorBoundaryState
> {
	state: VisualErrorBoundaryState = {
		failed: false,
	};

	static getDerivedStateFromError(): VisualErrorBoundaryState {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error(error, info);
	}

	handleRetry = () => {
		if (!this.state.failed) return this.props.children;
	};

	render() {
		if (!this.state.failed) {
			return this.props.children;
		}

		return (
			<div
				className={`group flex items-center justify-center flex-col overflow-hidden shadow-sm border border-destructive/30 bg-muted/20 p-6 text-center rounded-lg ${this.props.className}`}
			>
				<AlertTriangle className="h-7 w-7 text-destructive" />

				<div>
					<p className="font-medium">Não foi possível carregar este gráfico</p>
				</div>

				<Button
					variant="outline"
					size="sm"
					onClick={() => window.location.reload()}
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					Tentar novamente
				</Button>
			</div>
		);
	}
}
