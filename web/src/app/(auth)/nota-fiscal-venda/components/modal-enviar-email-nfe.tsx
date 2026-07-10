"use client";

import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { emailService } from "@/services/email.service";

type ModalEnviarEmailNfeProps = {
	open: boolean;
	idempresa: string;
	idnotafiscal: string;
	emailInicial?: string | null;
	onConcluir: () => void;
};

export function ModalEnviarEmailNfe({
	open,
	idempresa,
	idnotafiscal,
	emailInicial,
	onConcluir,
}: ModalEnviarEmailNfeProps) {
	const [destinatario, setDestinatario] = useState("");
	const [enviarXml, setEnviarXml] = useState(true);
	const [enviarDanfe, setEnviarDanfe] = useState(true);
	const [mensagem, setMensagem] = useState("");

	useEffect(() => {
		if (!open) return;
		setDestinatario(emailInicial?.trim() ?? "");
		setEnviarXml(true);
		setEnviarDanfe(true);
		setMensagem("");
	}, [open, emailInicial]);

	const { mutate: enviar, isPending } = useMutation({
		mutationFn: () =>
			emailService.enviarEmailNfe(idnotafiscal, {
				idempresa,
				destinatario: destinatario.trim(),
				enviarXml,
				enviarDanfe,
				mensagem: mensagem.trim() || undefined,
			}),
		onSuccess: () => {
			toast.success("E-mail enviado com sucesso");
			onConcluir();
		},
		onError: (erro) => {
			toast.error("Falha ao enviar e-mail", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
		},
	});

	const semEmail = !destinatario.trim();
	const semAnexo = !enviarXml && !enviarDanfe;

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v && !isPending) onConcluir();
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						Enviar NF-e por e-mail
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<p className="text-sm text-muted-foreground">
						Envie o XML e/ou o DANFE para o cliente. Você pode pular esta etapa.
					</p>

					<div className="space-y-2">
						<FieldLabel htmlFor="email-nfe-destinatario">
							E-mail do destinatário
						</FieldLabel>
						<Input
							id="email-nfe-destinatario"
							type="email"
							value={destinatario}
							onChange={(e) => setDestinatario(e.target.value)}
							placeholder="cliente@email.com"
							disabled={isPending}
						/>
						{semEmail && (
							<p className="text-xs text-amber-700" role="status">
								Cliente sem e-mail cadastrado. Informe um destinatário para
								enviar.
							</p>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Checkbox
								id="email-nfe-xml"
								checked={enviarXml}
								onCheckedChange={(v) => setEnviarXml(v === true)}
								disabled={isPending}
							/>
							<FieldLabel
								htmlFor="email-nfe-xml"
								className="cursor-pointer font-normal"
							>
								Anexar XML
							</FieldLabel>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="email-nfe-danfe"
								checked={enviarDanfe}
								onCheckedChange={(v) => setEnviarDanfe(v === true)}
								disabled={isPending}
							/>
							<FieldLabel
								htmlFor="email-nfe-danfe"
								className="cursor-pointer font-normal"
							>
								Anexar DANFE (PDF)
							</FieldLabel>
						</div>
						{semAnexo && (
							<p className="text-xs text-destructive" role="alert">
								Selecione ao menos um anexo.
							</p>
						)}
					</div>

					<div className="space-y-2">
						<FieldLabel htmlFor="email-nfe-mensagem">
							Mensagem (opcional)
						</FieldLabel>
						<Textarea
							id="email-nfe-mensagem"
							value={mensagem}
							onChange={(e) => setMensagem(e.target.value)}
							placeholder="Mensagem adicional no corpo do e-mail"
							rows={3}
							disabled={isPending}
						/>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={onConcluir}
						disabled={isPending}
					>
						Pular
					</Button>
					<Button
						type="button"
						disabled={isPending || semEmail || semAnexo}
						onClick={() => enviar()}
					>
						{isPending ? "Enviando..." : "Enviar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
