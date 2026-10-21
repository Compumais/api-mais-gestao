"use client";

import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "../components/page-container";
import { CentroCustoTree } from "./components/centro-custo-tree";

export default function CentrosCustoPage() {
	const router = useRouter();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement;

			if (isInputFocused) return;

			if (event.key === "F2") {
				event.preventDefault();
				router.push("/centros-custo/novo");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [router]);

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex flex-wrap items-center justify-between gap-2 px-4">
					<h1 className="text-2xl font-bold">Centros de custo</h1>
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" asChild>
							<Link href="/centros-custo/pendentes">
								<IconAlertCircle className="size-4" />
								Classificação pendente
							</Link>
						</Button>
						<Button asChild>
							<Link href="/centros-custo/novo">
								<IconPlus className="size-4" />
								Incluir (F2)
							</Link>
						</Button>
					</div>
				</div>
				<div className="rounded-lg border bg-card p-4 mx-4">
					<CentroCustoTree />
				</div>
			</div>
		</PageContainer>
	);
}
