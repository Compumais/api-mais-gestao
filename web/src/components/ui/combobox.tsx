import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
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
	const [dropdownCoords, setDropdownCoords] = React.useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);

	const containerRef = React.useRef<HTMLDivElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const updateCoords = React.useCallback(() => {
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			setDropdownCoords({
				top: rect.bottom + window.scrollY,
				left: rect.left + window.scrollX,
				width: rect.width,
			});
		}
	}, []);

	React.useEffect(() => {
		if (!open) return;

		updateCoords();

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				containerRef.current &&
				!containerRef.current.contains(target) &&
				dropdownRef.current &&
				!dropdownRef.current.contains(target)
			) {
				setOpen(false);
			}
		};

		const handleScrollOrResize = () => {
			updateCoords();
		};

		document.addEventListener("mousedown", handleClickOutside);
		window.addEventListener("scroll", handleScrollOrResize, true);
		window.addEventListener("resize", handleScrollOrResize);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			window.removeEventListener("scroll", handleScrollOrResize, true);
			window.removeEventListener("resize", handleScrollOrResize);
		};
	}, [open, updateCoords]);

	React.useEffect(() => {
		if (open && inputRef.current) {
			inputRef.current.focus();
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
						if (!open) {
							updateCoords();
						}
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

			{open &&
				dropdownCoords &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={dropdownRef}
						style={{
							position: "absolute",
							top: `${dropdownCoords.top + 4}px`,
							left: `${dropdownCoords.left}px`,
							minWidth: `${Math.max(dropdownCoords.width, 280)}px`,
						}}
						className={cn(
							"z-[99999] rounded-md border bg-popover text-popover-foreground shadow-xl ring-1 ring-black/10 dark:ring-white/10",
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
								<div
									className={cn(
										"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground",
										!value && "bg-accent text-accent-foreground",
									)}
									onClick={() => {
										onChange("");
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4 shrink-0",
											!value ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="break-words">{emptyLabel}</span>
								</div>
							)}
							{filteredOptions.length === 0 && !exibirOpcaoVazia ? (
								<div className="py-6 text-center text-sm text-muted-foreground">
									{emptyMessage}
								</div>
							) : (
								filteredOptions.map((option) => (
									<div
										key={option.value}
										className={cn(
											"relative flex cursor-pointer select-none items-start rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
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
												"mr-2 mt-0.5 h-4 w-4 shrink-0",
												value === option.value ? "opacity-100" : "opacity-0",
											)}
										/>
										<span className="leading-snug break-words">
											{option.label}
										</span>
									</div>
								))
							)}
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}
