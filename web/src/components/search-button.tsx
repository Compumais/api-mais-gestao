"use client";

import { IconSearch } from "@tabler/icons-react";
import { Button } from "./ui/button";
import { useSearchDialog } from "@/hooks/use-search-dialog";

export function SearchButton() {
  const { setOpen } = useSearchDialog();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setOpen(true)}
      aria-label="Pesquisar"
    >
      <IconSearch className="size-4" />
    </Button>
  );
}