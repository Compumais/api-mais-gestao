import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { FieldPath, FieldValues, UseFormSetValue } from "react-hook-form";

function codigoEstaVazio(valor: unknown): boolean {
	if (valor == null) return true;
	if (typeof valor === "string") return valor.trim() === "";
	if (typeof valor === "number") return Number.isNaN(valor);
	return false;
}

type UseProximoCodigoParams<TFieldValues extends FieldValues> = {
	idempresa?: string;
	enabled?: boolean;
	fetchFn: (idempresa: string) => Promise<{ codigo: number | string }>;
	setValue: UseFormSetValue<TFieldValues>;
	valorCodigoAtual: unknown;
	fieldName?: FieldPath<TFieldValues>;
};

export function useProximoCodigo<TFieldValues extends FieldValues>({
	idempresa,
	enabled = true,
	fetchFn,
	setValue,
	valorCodigoAtual,
	fieldName = "codigo" as FieldPath<TFieldValues>,
}: UseProximoCodigoParams<TFieldValues>) {
	const { data, isLoading } = useQuery({
		queryKey: ["proximo-codigo", fieldName, idempresa],
		queryFn: () => fetchFn(idempresa!),
		enabled: !!idempresa && enabled,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (data?.codigo == null) return;
		if (!codigoEstaVazio(valorCodigoAtual)) return;
		setValue(fieldName, data.codigo as TFieldValues[typeof fieldName], {
			shouldValidate: true,
		});
	}, [data?.codigo, fieldName, setValue, valorCodigoAtual]);

	return { isLoadingProximoCodigo: isLoading };
}
