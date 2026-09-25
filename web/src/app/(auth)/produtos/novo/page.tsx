import { Suspense } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { NovoProdutoClient } from "./novo-produto-client";

export default function NovoProdutoPage() {
	return (
		<PageContainer>
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-8">
						<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					</div>
				}
			>
				<NovoProdutoClient />
			</Suspense>
		</PageContainer>
	);
}
