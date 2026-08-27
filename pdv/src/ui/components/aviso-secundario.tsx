import { useNavigate } from "react-router-dom";
import type { StatusPdv } from "@/lib/pdv-types";
import { Button } from "@/ui/components/ui/button";

export function secundarioDesconectado(status: StatusPdv | null): boolean {
	return status?.modo === "secundario" && status.principalOnline === false;
}

export function AvisoSecundario({ status }: { status: StatusPdv | null }) {
	const navigate = useNavigate();
	if (status?.modo !== "secundario") {
		return null;
	}
	if (status.principalOnline) {
		return (
			<div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary ring-1 ring-primary/20">
				PDV secundário nº {status.numeropdv} · principal online
			</div>
		);
	}
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/30">
			<p>
				{status.principalErro ??
					"PDV principal offline. Vendas e mesas ficam bloqueadas até reconectar."}
			</p>
			{status.podeConfigurar ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => navigate("/config")}
				>
					Configurações
				</Button>
			) : null}
		</div>
	);
}
