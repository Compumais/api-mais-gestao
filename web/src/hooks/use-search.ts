"use client";

import { useEffect, useMemo, useState } from "react";
import { SEARCHABLE_PAGES } from "@/constants/search-pages";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEntitlements } from "@/hooks/use-plano";
import { isGarcom, isRouteAllowedForGarcom } from "@/lib/perfis";
import { podeAcessarRota } from "@/lib/regras-acesso-rotas";

function normalizeText(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

export function useSearch() {
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const isMobile = useIsMobile();
	const { user } = useAuth();
	const { hasFeature, hasModulo } = useEntitlements();
	const isGarcomUser = isGarcom(user);

	const paginasDisponiveis = useMemo(() => {
		let pages = SEARCHABLE_PAGES.filter(
			(page) => !page.mobileOnly || isMobile || isGarcomUser,
		);

		if (isGarcomUser) {
			pages = pages.filter((page) => isRouteAllowedForGarcom(page.url));
		}

		pages = pages.filter((page) =>
			podeAcessarRota(page.url, {
				perfil: user?.perfil,
				hasFeature,
				hasModulo,
			}),
		);

		return pages;
	}, [isMobile, isGarcomUser, user?.perfil, hasFeature, hasModulo]);

	// Debounce do termo de busca (300ms)
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Filtrar páginas baseado no termo de busca
	const results = useMemo(() => {
		if (!debouncedQuery.trim()) {
			return paginasDisponiveis;
		}

		const normalizedQuery = normalizeText(debouncedQuery);

		const filtered = paginasDisponiveis.filter((page) => {
			const normalizedTitle = normalizeText(page.title);
			const normalizedCategory = normalizeText(page.category);
			const normalizedKeywords = page.keywords
				? page.keywords.map((kw) => normalizeText(kw)).join(" ")
				: "";

			return (
				normalizedTitle.includes(normalizedQuery) ||
				normalizedCategory.includes(normalizedQuery) ||
				normalizedKeywords.includes(normalizedQuery)
			);
		});

		// Ordenar por relevância: match no título > categoria > keywords
		return filtered.sort((a, b) => {
			const aTitleMatch = normalizeText(a.title).includes(normalizedQuery);
			const bTitleMatch = normalizeText(b.title).includes(normalizedQuery);
			const aCategoryMatch = normalizeText(a.category).includes(
				normalizedQuery,
			);
			const bCategoryMatch = normalizeText(b.category).includes(
				normalizedQuery,
			);

			if (aTitleMatch && !bTitleMatch) return -1;
			if (!aTitleMatch && bTitleMatch) return 1;
			if (aCategoryMatch && !bCategoryMatch) return -1;
			if (!aCategoryMatch && bCategoryMatch) return 1;

			return a.title.localeCompare(b.title);
		});
	}, [debouncedQuery, paginasDisponiveis]);

	return {
		searchQuery,
		setSearchQuery,
		results,
		debouncedQuery,
	};
}
