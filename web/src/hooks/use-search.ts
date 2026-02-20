import { useState, useEffect, useMemo } from "react";
import { SEARCHABLE_PAGES, type SearchablePage } from "@/constants/search-pages";

export function useSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce do termo de busca (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Normalizar texto para busca (remove acentos e converte para minúsculas)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Filtrar páginas baseado no termo de busca
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return SEARCHABLE_PAGES;
    }

    const normalizedQuery = normalizeText(debouncedQuery);
    
    const filtered = SEARCHABLE_PAGES.filter((page) => {
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
      const aCategoryMatch = normalizeText(a.category).includes(normalizedQuery);
      const bCategoryMatch = normalizeText(b.category).includes(normalizedQuery);

      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      if (aCategoryMatch && !bCategoryMatch) return -1;
      if (!aCategoryMatch && bCategoryMatch) return 1;

      return a.title.localeCompare(b.title);
    });
  }, [debouncedQuery]);

  return {
    searchQuery,
    setSearchQuery,
    results,
    debouncedQuery,
  };
}

