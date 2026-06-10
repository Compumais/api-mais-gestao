import * as React from "react";
import { Input } from "./input";

interface MoneyInputProps
	extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
	value?: string | number;
	onChange: (value: string) => void;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
	({ className, value, onChange, ...props }, ref) => {
		const [displayValue, setDisplayValue] = React.useState("");

		React.useEffect(() => {
			if (value === undefined || value === null || value === "") {
				setDisplayValue("");
				return;
			}

			const numberVal = typeof value === "string" ? parseFloat(value) : value;
			if (!isNaN(numberVal)) {
				const formatted = new Intl.NumberFormat("pt-BR", {
					minimumFractionDigits: 2,
					style: "currency",
					currency: "BRL",
				}).format(numberVal);
				setDisplayValue(formatted);
			}
		}, [value]);

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const rawValue = e.target.value.replace(/\D/g, "");

			if (!rawValue) {
				onChange("");
				setDisplayValue("");
				return;
			}

			const numberValue = parseFloat(rawValue) / 100;
			onChange(numberValue.toFixed(2));
		};

		return (
			<Input
				ref={ref}
				type="text"
				inputMode="numeric"
				value={displayValue}
				onChange={handleChange}
				className={className}
				{...props}
			/>
		);
	},
);

MoneyInput.displayName = "MoneyInput";
