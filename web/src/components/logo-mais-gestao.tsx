import Image from "next/image";
import { cn } from "@/lib/utils";

const FONTES = {
	colorido: "/brand/mais-gestao-colorido.png",
	branco: "/brand/mais-gestao-branco.png",
} as const;

export function LogoMaisGestao({
	variante = "colorido",
	className,
	prioridade = false,
}: {
	variante?: keyof typeof FONTES;
	className?: string;
	prioridade?: boolean;
}) {
	return (
		<Image
			src={FONTES[variante]}
			alt="Mais Gestão"
			width={320}
			height={180}
			priority={prioridade}
			unoptimized
			className={cn("h-9 w-auto object-contain", className)}
		/>
	);
}
