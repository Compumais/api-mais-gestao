"use client";

import { IconSearch } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface PdvBuscaProdutoProps {
	value: string;
	onChange: (value: string) => void;
	onEnter: () => void;
	placeholder?: string;
}

export function PdvBuscaProduto({
	value,
	onChange,
	onEnter,
	placeholder = "Buscar por nome, código ou referência...",
}: PdvBuscaProdutoProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className="shrink-0 border-b p-4">
			<div className="relative">
				<IconSearch className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
				<Input
					ref={inputRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							onEnter();
						}
					}}
					placeholder={placeholder}
					className="h-12 pl-12 text-base"
					autoComplete="off"
				/>
			</div>
		</div>
	);
}
