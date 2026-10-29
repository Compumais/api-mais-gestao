import { cn } from "@/lib/utils";

const FONTES = {
	colorido: "brand/mais-gestao-colorido.png",
	branco: "brand/mais-gestao-branco.png",
} as const;

function urlAsset(caminho: string): string {
	return new URL(caminho, document.baseURI).href;
}

export function LogoMaisGestao({
	variante = "colorido",
	className,
}: {
	variante?: keyof typeof FONTES;
	className?: string;
}) {
	return (
		<img
			src={urlAsset(FONTES[variante])}
			alt="Mais Gestão"
			className={cn("h-10 w-auto object-contain", className)}
		/>
	);
}
