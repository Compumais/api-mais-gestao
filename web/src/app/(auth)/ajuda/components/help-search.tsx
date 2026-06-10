"use client";

import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function HelpSearch() {
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		// TODO: Implementar busca
		console.log("Buscando:", searchQuery);
	};

	return (
		<form onSubmit={handleSearch} className="relative">
			<IconSearch className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Descreva seu problema ou pesquise uma palavra-chave..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className="h-14 rounded-full border-2 pl-12 pr-4 text-base shadow-lg transition-shadow focus-visible:shadow-xl"
			/>
		</form>
	);
}
