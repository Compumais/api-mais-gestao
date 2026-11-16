import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
	options: { value: string; label: string }[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	className?: string;
	dropdownClassName?: string;
	disabled?: boolean;
	/** Permite limpar a seleção (ex.: campos opcionais). */
	allowEmpty?: boolean;
	emptyLabel?: string;
}

export function Combobox({
	options,
	value,
	onChange,
	placeholder = "Selecione...",
	searchPlaceholder = "Buscar...",
	emptyMessage = "Nenhum item encontrado.",
	className,
	dropdownClassName,
	disabled = false,
	allowEmpty = false,
	emptyLabel = "Nenhum",
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		if (!open) {
			setSearch("");
		}
	}, [open]);

	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(search.toLowerCase()),
	);

	const exibirOpcaoVazia =
		allowEmpty &&
		(emptyLabel.toLowerCase().includes(search.toLowerCase()) || search === "");

	const selectedLabel =
		options.find((option) => option.value === value)?.label ??
		(value ? value : undefined);

	const selecionarValor = (novoValor: string) => {
		onChange(novoValor);
		setOpen(false);
	};

	return (
		<PopoverPrimitive.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!disabled) {
					setOpen(nextOpen);
				}
			}}
		>
			<div className={cn("relative w-full", className)}>
				<PopoverPrimitive.Trigger asChild disabled={disabled}>
					<button
						type="button"
						disabled={disabled}
						role="combobox"
						aria-expanded={open}
						className={cn(
							"flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-left",
							disabled && "cursor-not-allowed opacity-50",
							!selectedLabel && "text-muted-foreground",
						)}
					>
						<span className="truncate">{selectedLabel || placeholder}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</button>
				</PopoverPrimitive.Trigger>
			</div>

			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Content
					data-combobox-dropdown="true"
					align="start"
					sideOffset={4}
					onOpenAutoFocus={(e) => {
						e.preventDefault();
						inputRef.current?.focus();
					}}
					style={{
						minWidth: "max(var(--radix-popover-trigger-width), 280px)",
					}}
					className={cn(
						"z-[99999] pointer-events-auto rounded-md border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/10 dark:ring-white/10 outline-none",
						dropdownClassName,
					)}
				>
					<div
						className="flex items-center border-b px-3"
						onClick={(e) => e.stopPropagation()}
					>
						<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
						<input
							ref={inputRef}
							className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
							placeholder={searchPlaceholder}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					<div className="max-h-[260px] overflow-y-auto p-1">
						{exibirOpcaoVazia && (
							<button
								type="button"
								className={cn(
									"relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground",
									!value && "bg-accent text-accent-foreground",
								)}
								onClick={() => selecionarValor("")}
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4 shrink-0",
										!value ? "opacity-100" : "opacity-0",
									)}
								/>
								<span className="break-words">{emptyLabel}</span>
							</button>
						)}
						{filteredOptions.length === 0 && !exibirOpcaoVazia ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								{emptyMessage}
							</div>
						) : (
							filteredOptions.map((option) => (
								<button
									key={option.value}
									type="button"
									className={cn(
										"relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
										value === option.value &&
											"bg-accent text-accent-foreground",
									)}
									onClick={() => selecionarValor(option.value)}
								>
									<Check
										className={cn(
											"mr-2 mt-0.5 h-4 w-4 shrink-0",
											value === option.value ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="leading-snug break-words">
										{option.label}
									</span>
								</button>
							))
						)}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}
