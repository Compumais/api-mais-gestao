import { ImageResponse } from "next/og";
import { PWA_THEME_COLOR } from "@/constants/pwa";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: PWA_THEME_COLOR,
				borderRadius: 8,
			}}
		>
			<svg
				width="22"
				height="22"
				viewBox="0 0 64 64"
				fill="none"
				aria-hidden="true"
			>
				<path
					d="M40 14 C30 14 22 22 22 32 C22 42 30 50 40 50"
					stroke="#F8FAFC"
					strokeWidth="6"
					strokeLinecap="round"
				/>
				<line
					x1="44"
					y1="26"
					x2="44"
					y2="38"
					stroke="#F8FAFC"
					strokeWidth="5"
					strokeLinecap="round"
				/>
				<line
					x1="38"
					y1="32"
					x2="50"
					y2="32"
					stroke="#F8FAFC"
					strokeWidth="5"
					strokeLinecap="round"
				/>
			</svg>
		</div>,
		size,
	);
}
