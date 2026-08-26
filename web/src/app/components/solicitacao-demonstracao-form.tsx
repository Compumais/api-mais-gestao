"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconBrandWhatsapp, IconCheck } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_CONTACT } from "@/constants/legal-contact";
import {
	SEGMENTOS_DEMONSTRACAO,
	type SolicitacaoDemonstracaoFormData,
	solicitacaoDemonstracaoSchema,
} from "@/schemas/demonstracao.schema";

const CLASSE_CAMPO = "h-10 text-sm md:text-sm";

function montarMensagemWhatsApp(
	dados: SolicitacaoDemonstracaoFormData,
): string {
	const linhas = [
		"Olá! Gostaria de solicitar uma demonstração do Mais Gestão.",
		"",
		`Nome: ${dados.nome}`,
		`Empresa: ${dados.empresa}`,
		`Email: ${dados.email}`,
		`Telefone: ${dados.telefone}`,
		`Segmento: ${dados.segmento}`,
	];

	if (dados.mensagem?.trim()) {
		linhas.push("", `Mensagem: ${dados.mensagem.trim()}`);
	}

	return linhas.join("\n");
}

function montarUrlWhatsApp(dados: SolicitacaoDemonstracaoFormData): string {
	const texto = montarMensagemWhatsApp(dados);
	return `https://wa.me/${LEGAL_CONTACT.whatsapp}?text=${encodeURIComponent(texto)}`;
}

export function SolicitacaoDemonstracaoForm() {
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitSuccessful },
		getValues,
	} = useForm<SolicitacaoDemonstracaoFormData>({
		resolver: zodResolver(solicitacaoDemonstracaoSchema),
		defaultValues: {
			nome: "",
			empresa: "",
			email: "",
			telefone: "",
			mensagem: "",
		},
	});

	const onSubmit = (dados: SolicitacaoDemonstracaoFormData) => {
		const url = montarUrlWhatsApp(dados);
		window.open(url, "_blank", "noopener,noreferrer");
		toast.success("Solicitação pronta. Conclua o envio no WhatsApp.");
	};

	if (isSubmitSuccessful) {
		const urlWhatsApp = montarUrlWhatsApp(getValues());

		return (
			<div
				className="flex flex-col items-center gap-4 rounded-xl border bg-background p-6 text-center"
				role="status"
				aria-live="polite"
			>
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<IconCheck className="h-6 w-6" aria-hidden="true" />
				</div>
				<div className="space-y-2">
					<p className="text-lg font-semibold">Solicitação preparada</p>
					<p className="text-sm text-muted-foreground">
						Abrimos o WhatsApp com os seus dados. Se a janela não apareceu, use
						o botão abaixo para enviar à nossa equipe.
					</p>
				</div>
				<Button asChild className="w-full sm:w-auto">
					<a href={urlWhatsApp} target="_blank" rel="noopener noreferrer">
						<IconBrandWhatsapp className="h-5 w-5" aria-hidden="true" />
						Enviar no WhatsApp
					</a>
				</Button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} noValidate>
			<FieldGroup>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={!!errors.nome}>
						<FieldLabel htmlFor="demonstracao-nome">Nome</FieldLabel>
						<Input
							id="demonstracao-nome"
							autoComplete="name"
							placeholder="Seu nome"
							className={CLASSE_CAMPO}
							aria-invalid={!!errors.nome}
							aria-describedby={
								errors.nome ? "demonstracao-nome-erro" : undefined
							}
							{...register("nome")}
						/>
						<FieldError
							id="demonstracao-nome-erro"
							errors={errors.nome ? [errors.nome] : []}
						/>
					</Field>
					<Field data-invalid={!!errors.empresa}>
						<FieldLabel htmlFor="demonstracao-empresa">Empresa</FieldLabel>
						<Input
							id="demonstracao-empresa"
							autoComplete="organization"
							placeholder="Nome da empresa"
							className={CLASSE_CAMPO}
							aria-invalid={!!errors.empresa}
							aria-describedby={
								errors.empresa ? "demonstracao-empresa-erro" : undefined
							}
							{...register("empresa")}
						/>
						<FieldError
							id="demonstracao-empresa-erro"
							errors={errors.empresa ? [errors.empresa] : []}
						/>
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field data-invalid={!!errors.email}>
						<FieldLabel htmlFor="demonstracao-email">Email</FieldLabel>
						<Input
							id="demonstracao-email"
							type="email"
							autoComplete="email"
							placeholder="julia.r@example.org"
							className={CLASSE_CAMPO}
							aria-invalid={!!errors.email}
							aria-describedby={
								errors.email ? "demonstracao-email-erro" : undefined
							}
							{...register("email")}
						/>
						<FieldError
							id="demonstracao-email-erro"
							errors={errors.email ? [errors.email] : []}
						/>
					</Field>
					<Field data-invalid={!!errors.telefone}>
						<FieldLabel htmlFor="demonstracao-telefone">Telefone</FieldLabel>
						<Input
							id="demonstracao-telefone"
							type="tel"
							autoComplete="tel"
							placeholder="(34) 99999-0000"
							className={CLASSE_CAMPO}
							aria-invalid={!!errors.telefone}
							aria-describedby={
								errors.telefone ? "demonstracao-telefone-erro" : undefined
							}
							{...register("telefone")}
						/>
						<FieldError
							id="demonstracao-telefone-erro"
							errors={errors.telefone ? [errors.telefone] : []}
						/>
					</Field>
				</div>
				<Field data-invalid={!!errors.segmento}>
					<FieldLabel htmlFor="demonstracao-segmento">Segmento</FieldLabel>
					<Controller
						control={control}
						name="segmento"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger
									id="demonstracao-segmento"
									className="h-10 w-full text-sm"
									aria-invalid={!!errors.segmento}
									aria-describedby={
										errors.segmento ? "demonstracao-segmento-erro" : undefined
									}
								>
									<SelectValue placeholder="Selecione o ramo da empresa" />
								</SelectTrigger>
								<SelectContent>
									{SEGMENTOS_DEMONSTRACAO.map((segmento) => (
										<SelectItem key={segmento} value={segmento}>
											{segmento}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
					<FieldError
						id="demonstracao-segmento-erro"
						errors={errors.segmento ? [errors.segmento] : []}
					/>
				</Field>
				<Field data-invalid={!!errors.mensagem}>
					<FieldLabel htmlFor="demonstracao-mensagem">
						Como podemos ajudar?{" "}
						<span className="font-normal text-muted-foreground">
							(opcional)
						</span>
					</FieldLabel>
					<Textarea
						id="demonstracao-mensagem"
						placeholder="Conte um pouco do seu negócio: loja, restaurante, oficina..."
						className="min-h-24 text-sm md:text-sm"
						aria-invalid={!!errors.mensagem}
						aria-describedby={
							errors.mensagem ? "demonstracao-mensagem-erro" : undefined
						}
						{...register("mensagem")}
					/>
					<FieldError
						id="demonstracao-mensagem-erro"
						errors={errors.mensagem ? [errors.mensagem] : []}
					/>
				</Field>
				<Button type="submit" size="lg" className="w-full">
					<IconBrandWhatsapp className="h-5 w-5" aria-hidden="true" />
					Solicitar demonstração
				</Button>
				<p className="text-center text-xs text-muted-foreground">
					A equipe recebe o pedido e agenda a apresentação. Também atendemos em{" "}
					{LEGAL_CONTACT.telefone} ou{" "}
					<a
						href={`mailto:${LEGAL_CONTACT.email}`}
						className="underline underline-offset-2 hover:text-foreground"
					>
						{LEGAL_CONTACT.email}
					</a>
					.
				</p>
			</FieldGroup>
		</form>
	);
}
