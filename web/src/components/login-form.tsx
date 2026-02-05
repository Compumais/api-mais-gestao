"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { authService } from "@/services/auth.service";
import { GoogleIcon } from "./icons/google-icon";
import { Badge } from "./ui/badge";

const TOKEN_KEY = "token:mais-gestao";

const loginSchema = z.object({
	email: z
		.email({ message: "Email inválido" })
		.min(1, { message: "Email é obrigatório" }),
	password: z
		.string({ message: "Senha é obrigatória" })
		.min(1, { message: "Senha é obrigatória" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const router = useRouter();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const { mutate: signIn, isPending } = useMutation({
		mutationFn: authService.signIn,
		onSuccess: (data) => {
			// O Better Auth retorna o token em session.token
			const token = data.token || data.session?.token;
			if (token) {
				localStorage.setItem(TOKEN_KEY, token);
				toast.success("Login realizado com sucesso!");
				router.push("/dashboard");
			} else {
				toast.error("Token não recebido do servidor");
			}
		},
		onError: (error: Error) => {
			toast.error(
				error.message || "Erro ao realizar login. Verifique suas credenciais.",
			);
		},
	});

	const onSubmit = (data: LoginFormData) => {
		signIn(data);
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
								<p className="text-muted-foreground text-balance">
									Faça login na sua conta Mais Gestão
								</p>
							</div>
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
								<div className="flex items-center">
									<FieldLabel htmlFor="password">Senha</FieldLabel>
									<Link
										href="#"
										className="ml-auto text-sm underline-offset-2 hover:underline"
									>
										Esqueceu sua senha?
									</Link>
								</div>
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
							<Field>
								<Button type="submit" disabled={isPending}>
									{isPending ? "Entrando..." : "Entrar"}
								</Button>
							</Field>
							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
								Ou continue com
							</FieldSeparator>
							<Field className="grid grid-cols-1 gap-4">
								<Button
									className="relative"
									variant="outline"
									type="button"
									disabled
								>
									<Badge className="absolute top-[-10px] right-[-10px]">
										Em breve
									</Badge>
									<GoogleIcon />
									<span className="sr-only">Login com Google</span>
								</Button>
							</Field>
							<FieldDescription className="text-center">
								Não tem uma conta? <Link href="/registrar">Cadastre-se</Link>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="bg-muted relative hidden md:block">
						<Image
							src="/login-image.jpg"
							alt="Image"
							width={500}
							height={500}
							className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7]"
						/>
					</div>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				Ao continuar, você concorda com nossos{" "}
				<Link href="#">Termos de Serviço</Link> e{" "}
				<Link href="#">Política de Privacidade</Link>.
			</FieldDescription>
		</div>
	);
}
