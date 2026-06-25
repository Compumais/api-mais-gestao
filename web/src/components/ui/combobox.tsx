import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
	options: { value: string; label: string }[];
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	emptyMessage?: string;
	className?: string;
	disabled?: boolean;
}

export function Combobox({
	options,
	value,
	onChange,
	placeholder = "Selecione...",
	searchPlaceholder = "Buscar...",
	emptyMessage = "Nenhum item encontrado.",
	className,
	disabled = false,
}: ComboboxProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	React.useEffect(() => {
		if (open && inputRef.current) {
			inputRef.current.focus();
		}
	}, [open]);

	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(search.toLowerCase()),
	);

	const selectedLabel = options.find((option) => option.value === value)?.label;

	return (
		<div className={cn("relative w-full", className)} ref={containerRef}>
			<div
				className={cn(
					"flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
					disabled && "cursor-not-allowed opacity-50",
					!selectedLabel && "text-muted-foreground",
				)}
				onClick={() => {
					if (!disabled) {
						setOpen(!open);
						setSearch("");
					}
				}}
				role="combobox"
				aria-expanded={open}
			>
				<span className="truncate">{selectedLabel || placeholder}</span>
				<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</div>

			{open && (
				<div className="absolute top-full left-0 z-[100] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
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
					<div className="max-h-[200px] overflow-y-auto p-1">
						{filteredOptions.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								{emptyMessage}
							</div>
						) : (
							filteredOptions.map((option) => (
								<div
									key={option.value}
									className={cn(
										"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
										value === option.value &&
											"bg-accent text-accent-foreground",
									)}
									onClick={() => {
										onChange(option.value);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											value === option.value ? "opacity-100" : "opacity-0",
										)}
									/>
									{option.label}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
