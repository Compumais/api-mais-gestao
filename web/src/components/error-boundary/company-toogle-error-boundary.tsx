"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component } from "react";

type CompanyToogleBoundaryProps = {
	children: React.ReactNode;
};

type CompanyToogleBoundaryState = {
	failed: boolean;
};

export class CompanyToogleBoundary extends Component<
	CompanyToogleBoundaryProps,
	CompanyToogleBoundaryState
> {
	state: CompanyToogleBoundaryState = {
		failed: false,
	};

	static getDerivedStateFromError(): CompanyToogleBoundaryState {
		return { failed: true };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error(error, info);
	}

	render() {
		if (!this.state.failed) return this.props.children;

		return (
			<div className="flex items-center gap-2 text-destructive p-1 border border-destructive/30 bg-muted rounded-md">
				<AlertTriangle className="h-3 w-3" />
				<span className="font-bold text-[10px]">
					Não foi possível carregar de empresa
				</span>
			</div>
		);
	}
}
