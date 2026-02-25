interface CPlusIconProps {
	size?: number;
}

export function CPlusIcon({ size = 64 }: CPlusIconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>C+ (C Plus)</title>
			<path
				d="M40 14
       C30 14 22 22 22 32
       C22 42 30 50 40 50"
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
				fill="none"
			/>
			<line
				x1="44"
				y1="26"
				x2="44"
				y2="38"
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<line
				x1="38"
				y1="32"
				x2="50"
				y2="32"
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
