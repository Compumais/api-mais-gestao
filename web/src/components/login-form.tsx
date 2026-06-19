"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { marcarSessaoFrontend } from "@/lib/auth-session-cookie";
import {
	extractSessionTokenFromLoginResponse,
	setSessionToken,
} from "@/lib/auth-token";
import { authClient } from "@/lib/auth-client";
import { limparEmpresaSelecionada, EMPRESA_FORCAR_PRIMEIRA_KEY, marcarSelecaoPrimeiraEmpresaNoLogin } from "@/provider/empresa-provider";
import { authService, type LoginResponse } from "@/services/auth.service";
import { empresasUsuarioQueryOptions } from "@/hooks/use-empresas-usuario";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	hasPerfil,
	resolveRedirectForUser,
} from "@/lib/perfis";
import { GoogleIcon } from "./icons/google-icon";

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
	redirectTo = null,
	...props
}: React.ComponentProps<"div"> & { redirectTo?: string | null }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selecionarEmpresa } = useEmpresa();
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
	});

	const { mutate: signIn, isPending } = useMutation({
		mutationFn: async (credentials: LoginFormData) => {
			const resultado = await authClient.signIn.email({
				email: credentials.email,
				password: credentials.password,
			});

			if (resultado.error) {
				throw new Error(
					resultado.error.message ||
						"Erro ao realizar login. Verifique suas credenciais.",
				);
			}

			const loginData = (resultado.data ?? {}) as LoginResponse;
			const sessionToken = extractSessionTokenFromLoginResponse(loginData);

			if (sessionToken) {
				setSessionToken(sessionToken);
			} else {
				const sessao = await authClient.getSession();
				const tokenSessao = extractSessionTokenFromLoginResponse(
					sessao.data ?? {},
				);
				if (tokenSessao) {
					setSessionToken(tokenSessao);
				}
			}

			return loginData;
		},
		onSuccess: async (loginData: LoginResponse) => {
			marcarSelecaoPrimeiraEmpresaNoLogin();
			limparEmpresaSelecionada();
			marcarSessaoFrontend();

			let perfil = null;
			try {
				perfil = await queryClient.fetchQuery({
					queryKey: ["perfil"],
					queryFn: () => authService.getProfile(),
					staleTime: 0,
				});
			} catch {
				try {
					const sessao = await authClient.getSession();
					const sessionUser = sessao.data?.user as
						| {
								id?: string;
								name?: string;
								email?: string;
								perfil?: string | string[];
								plano?: string | null;
						  }
						| undefined;

					if (sessionUser?.id) {
						const perfilSessao = Array.isArray(sessionUser.perfil)
							? sessionUser.perfil
							: sessionUser.perfil
								? [sessionUser.perfil]
								: [];

						perfil = {
							id: sessionUser.id,
							nome: sessionUser.name ?? loginData.user?.name ?? "",
							email: sessionUser.email ?? loginData.user?.email ?? "",
							perfil: perfilSessao,
							plano: sessionUser.plano ?? null,
						};
						queryClient.setQueryData(["perfil"], perfil);
					}
				} catch {
					// ignora fallback secundário
				}
				if (!perfil && loginData.user) {
					perfil = {
						id: loginData.user.id,
						nome: loginData.user.name,
						email: loginData.user.email,
						perfil: [],
						plano: null,
					};
					queryClient.setQueryData(["perfil"], perfil);
				}
			}

			let empresasCount = 0;
			let empresasCarregadasComSucesso = false;
			if (perfil?.id) {
				try {
					const empresas = await queryClient.fetchQuery(
						empresasUsuarioQueryOptions(perfil.id),
					);
					empresasCarregadasComSucesso = true;
					empresasCount = empresas.length;
					const primeiraEmpresa = empresas[0];
					if (primeiraEmpresa) {
						selecionarEmpresa(primeiraEmpresa);
						sessionStorage.removeItem(EMPRESA_FORCAR_PRIMEIRA_KEY);
					}
				} catch {
					// ProtectedRoute tentará carregar novamente no dashboard
				}
			}
			toast.success("Login realizado com sucesso!");
			const perfilUsuario = perfil
				? {
						perfil: Array.isArray(perfil.perfil)
							? perfil.perfil
							: perfil.perfil
								? [perfil.perfil]
								: [],
					}
				: null;
			const destino =
				empresasCarregadasComSucesso &&
				empresasCount === 0 &&
				hasPerfil(perfilUsuario?.perfil, "proprietario")
					? "/empresas/nova"
					: resolveRedirectForUser(perfilUsuario, redirectTo);
			router.push(destino);
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
									onClick={() => {
										authClient.signIn.social({
											provider: "google",
											callbackURL: `${window.location.origin}/dashboard`,
										});
									}}
								>
									<GoogleIcon />
									<span>Entrar com Google</span>
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
