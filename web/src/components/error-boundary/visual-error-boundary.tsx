"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component } from "react";
import { Button } from "@/components/ui/button";

type VisualErrorBoundaryProps = {
	children: React.ReactNode;
	className?: string;
	title?: string;
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
		this.setState({ failed: false });
	};

	render() {
		if (!this.state.failed) {
			return this.props.children;
		}

		const title =
			this.props.title ?? "Não foi possível carregar este gráfico";

		return (
			<div
				className={`group flex items-center justify-center flex-col overflow-hidden shadow-sm border border-destructive/30 bg-muted/20 p-6 text-center rounded-lg ${this.props.className}`}
			>
				<AlertTriangle className="h-7 w-7 text-destructive" />

				<div>
					<p className="font-medium">{title}</p>
				</div>

				<Button variant="outline" size="sm" onClick={this.handleRetry}>
					<RefreshCw className="mr-2 h-4 w-4" />
					Tentar novamente
				</Button>
			</div>
		);
	}
}
