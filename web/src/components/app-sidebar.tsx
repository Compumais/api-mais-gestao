"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { CPlusIcon } from "./icons/c-plus";
import { DATA } from "@/constants/nav-constants"
import { NavDocuments } from "./nav-documents";
import { usePlano } from "@/hooks/use-plano";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  // Verificar se o usuário tem perfil "usuario"
  const isUsuario = React.useMemo(() => {
    if (!user?.perfil) return false;
    return user.perfil.includes("usuario");
  }, [user]);

  // Filtrar itens baseado no perfil
  const navMainItems = React.useMemo(() => {
    if (isUsuario) {
      // Para usuário: apenas Dashboard e Clientes
      return DATA.navMain.filter(
        (item) => item.title === "Dashboard" || item.title === "Clientes",
      );
    }
    return DATA.navMain;
  }, [isUsuario]);

  const navCloudsItems = React.useMemo(() => {
    if (isUsuario) {
      return DATA.navClouds.filter(
        (item) => item.title === "Movimentações" || item.title === "Relatórios",
      );
    }
    return DATA.navClouds;
  }, [isUsuario]);

  const { isBasic } = usePlano();

  const navSecondaryItems = React.useMemo(() => {
    let items = DATA.navSecondary;

    if (isUsuario) {
      // Para usuário: Configurações, Ajuda e Pesquisar (sem Auditoria)
      items = items.filter(
        (item) =>
          item.title === "Configurações" ||
          item.title === "Ajuda" ||
          item.title === "Pesquisar",
      );
    }

    // Bloqueia Auditoria para plano Básico
    if (isBasic) {
      items = items.filter((item) => item.title !== "Auditoria");
    }

    return items;
  }, [isUsuario, isBasic]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu className="flex flex-row items-center gap-1 select-none">
          <CPlusIcon size={32} />
          <h1 className="text-base font-semibold mb-0.5 group-data-[collapsible=icon]:hidden">
            Mais Gestão
          </h1>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        {navCloudsItems.length > 0 && (
          <NavSecondary label="Financeiro" items={navCloudsItems} />
        )}
        <NavDocuments items={DATA.others} />
        <NavSecondary
          label="Outros"
          items={navSecondaryItems}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user as { nome: string; email: string } | null} />
      </SidebarFooter>
    </Sidebar>
  );
}
