import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BarcodeInputProps = {
	onScan: (codigo: string) => void;
	placeholder?: string;
	className?: string;
};

/** Input sempre focado para leitura de leitor de código de barras (Enter dispara a busca). */
export function BarcodeInput({
	onScan,
	placeholder = "Bipe o código de barras ou digite e pressione Enter...",
	className,
}: BarcodeInputProps) {
	const [valor, setValor] = useState("");
	const ref = useRef<HTMLInputElement>(null);

	useEffect(() => {
		ref.current?.focus();
	}, []);

	function refocar() {
		window.setTimeout(() => ref.current?.focus(), 50);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			const codigo = valor.trim();
			if (codigo) {
				onScan(codigo);
				setValor("");
			}
		}
	}

	return (
		<input
			ref={ref}
			value={valor}
			onChange={(e) => setValor(e.target.value)}
			onKeyDown={onKeyDown}
			onBlur={refocar}
			placeholder={placeholder}
			autoComplete="off"
			className={cn(
				"flex h-11 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				className,
			)}
		/>
	);
}
