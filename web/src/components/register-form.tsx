"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type RegisterFormData, registerSchema } from "@/schemas/auth.schema";
import { authService } from "@/services/auth.service";
import { GoogleIcon } from "./icons/google-icon";

export function RegisterForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
	});

	const { mutate: signUp, isPending } = useMutation({
		mutationFn: authService.signUp,
		onSuccess: (data) => {
			toast.success("Cadastro realizado com sucesso!");
			router.push("/entrar");
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao realizar cadastro");
		},
	});

	const onSubmit = ({ name, email, password }: RegisterFormData) => {
		signUp({ name, email, password });
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">Bem-vindo ao Mais Gestão</h1>
								<p className="text-muted-foreground text-balance">
									Faça seu cadastro na plataforma Mais Gestão
								</p>
							</div>
							<Field data-inavlid={!!errors.name}>
								<FieldLabel htmlFor="name">Nome</FieldLabel>
								<Input
									id="name"
									placeholder="Seu nome"
									aria-invalid={!!errors.name}
									aria-describedby={errors.name ? "name-error" : undefined}
									{...register("name")}
								/>
								<FieldError errors={errors.name ? [errors.name] : []} />
							</Field>
							<Field data-invalid={!!errors.email}>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									placeholder="seu@email.com"
									aria-invalid={!!errors.email}
									aria-describedby={errors.email ? "email-error" : undefined}
									{...register("email")}
								/>
								<FieldError errors={errors.email ? [errors.email] : []} />
							</Field>
							<Field data-invalid={!!errors.password}>
								<FieldLabel htmlFor="password">Senha</FieldLabel>
								<Input
									id="password"
									type="password"
									aria-invalid={!!errors.password}
									aria-describedby={
										errors.password ? "password-error" : undefined
									}
									{...register("password")}
								/>
								<FieldError errors={errors.password ? [errors.password] : []} />
							</Field>
							<Field data-invalid={!!errors.confirmPassword}>
								<FieldLabel htmlFor="confirmPassword">
									Confirmação de Senha
								</FieldLabel>
								<Input
									id="confirmPassword"
									type="password"
									aria-invalid={!!errors.confirmPassword}
									aria-describedby={
										errors.confirmPassword ? "confirmPassword-error" : undefined
									}
									{...register("confirmPassword")}
								/>
								<FieldError
									errors={
										errors.confirmPassword ? [errors.confirmPassword] : []
									}
								/>
							</Field>
							<Field>
								<Button type="submit" disabled={isPending}>
									{isPending ? "Criando conta..." : "Criar conta"}
								</Button>
							</Field>
							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
								Ou entre com
							</FieldSeparator>
							<Field className="grid grid-cols-1 gap-4">
								<Button variant="outline" type="button" disabled>
									<GoogleIcon />
									<span className="sr-only">Entrar com Google</span>
								</Button>
							</Field>
							<FieldDescription className="text-center">
								Já possui uma conta? <a href="/entrar">Entrar</a>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="bg-muted relative hidden md:block">
						<Image
							src="/register-image.png"
							alt="Image"
							width={500}
							height={500}
							className="absolute inset-0 h-full w-full object-cover right-1/2 dark:brightness-[0.7]"
						/>
					</div>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				Ao continuar, você concorda com nossos{" "}
				<Link href="/termos-de-servico">Termos de Serviço</Link> e{" "}
				<Link href="/politica-de-privacidade">Política de Privacidade</Link>.
			</FieldDescription>
		</div>
	);
}
