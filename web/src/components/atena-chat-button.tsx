"use client";

import { IconSparkles, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useAtenaChat } from "@/hooks/use-atena-chat";
import { cn } from "@/lib/utils";

export function AtenaChatButton() {
	const { isOpen, setIsOpen } = useAtenaChat();

	return (
		<Button
			onClick={() => setIsOpen(!isOpen)}
			className={cn(
				"fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl",
				isOpen
					? "bg-destructive hover:bg-destructive/90"
					: "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
			)}
			size="icon"
			aria-label={isOpen ? "Fechar chat" : "Abrir chat com Atena"}
		>
			{isOpen ? (
				<IconX className="h-6 w-6" />
			) : (
				<IconSparkles className="h-6 w-6 animate-pulse" />
			)}
		</Button>
	);
}
