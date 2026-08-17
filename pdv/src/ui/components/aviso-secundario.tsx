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
			<div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
				PDV secundário nº {status.numeropdv} · principal online
			</div>
		);
	}
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
			<p>
				{status.principalErro ??
					"PDV principal offline. Vendas e mesas ficam bloqueadas até reconectar."}
			</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => navigate("/config")}
			>
				Configurações
			</Button>
		</div>
	);
}
