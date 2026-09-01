import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans, Roboto_Slab } from "next/font/google";
import { PwaRoot } from "@/components/pwa-root";
import {
	PWA_APP_NAME,
	PWA_DESCRIPTION,
	PWA_THEME_COLOR,
} from "@/constants/pwa";
import { Providers } from "./providers";
import "./globals.css";
import { cn } from "@/lib/utils";

const robotoSlabHeading = Roboto_Slab({
	subsets: ["latin"],
	variable: "--font-heading",
});

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	applicationName: PWA_APP_NAME,
	title: "Mais Gestão - Controle Financeiro",
	description: PWA_DESCRIPTION,
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: PWA_APP_NAME,
	},
	formatDetection: {
		telephone: false,
	},
};

export const viewport: Viewport = {
	themeColor: PWA_THEME_COLOR,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			suppressHydrationWarning
			className={cn("font-sans", notoSans.variable, robotoSlabHeading.variable)}
		>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<PwaRoot>
					<Providers>{children}</Providers>
				</PwaRoot>
			</body>
		</html>
	);
}
