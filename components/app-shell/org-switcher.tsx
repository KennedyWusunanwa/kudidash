"use client";

import { useTransition } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { switchOrgAction } from "@/lib/actions/org.actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrgOption {
  org_id: string;
  role: string;
  organization?: { name?: string; slug?: string };
}

export function OrgSwitcher({
  currentOrgId,
  orgs,
}: {
  currentOrgId: string;
  orgs: OrgOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const current = orgs.find((org) => org.org_id === currentOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-w-44 justify-between rounded-2xl bg-background/85"
          disabled={isPending}
          aria-label="Switch organization"
        >
          <span className="truncate">
            {current?.organization?.name ?? "Select organization"}
          </span>
          <ChevronsUpDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-[1.1rem] border-border/70 p-2">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.org_id}
            onSelect={() =>
              startTransition(async () => {
                await switchOrgAction({ orgId: org.org_id });
              })
            }
            className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {org.organization?.name ?? org.org_id}
              </div>
              <div className="text-xs text-muted-foreground">{org.role}</div>
            </div>
            <Check
              className={cn("size-4", org.org_id === currentOrgId ? "opacity-100" : "opacity-0")}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
