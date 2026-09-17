"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { useNavAbasAbertasOpcional } from "@/hooks/use-nav-abas-abertas";

export function useRascunhoAbaForm<T extends FieldValues>(
	form: UseFormReturn<T>,
	opcoes?: { enabled?: boolean; chave?: string },
) {
	const pathname = usePathname() ?? "";
	const ctx = useNavAbasAbertasOpcional();
	const enabled = opcoes?.enabled ?? true;
	const chave = opcoes?.chave ?? pathname;
	const restaurouRef = useRef(false);

	useEffect(() => {
		if (!enabled || !ctx || restaurouRef.current || !chave) return;
		restaurouRef.current = true;
		const salvo = ctx.lerRascunho<T>(chave);
		if (salvo) {
			form.reset(salvo, { keepDefaultValues: true });
		}
	}, [chave, ctx, enabled, form]);

	useEffect(() => {
		if (!enabled || !ctx || !chave) return;
		const sub = form.watch(() => {
			if (!restaurouRef.current) return;
			ctx.salvarRascunho(chave, form.getValues());
		});
		return () => sub.unsubscribe();
	}, [chave, ctx, enabled, form]);

	return {
		limparRascunho: () => ctx?.limparRascunho(chave),
	};
}
