"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCustomerAction } from "@/lib/actions/masters.actions";
import { Button } from "@/components/ui/button";

export function CustomerDeleteButton({
  orgId,
  customerId,
  customerName,
  disabled = false,
}: {
  orgId: string;
  customerId: string;
  customerName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (disabled || isPending) return;
    if (
      !window.confirm(
        `Delete customer "${customerName}"? This action cannot be undone and only works when there are no transactions.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCustomerAction({ orgId, customerId });
      if (!result.success) {
        toast.error(result.error || "Failed to delete customer.");
        return;
      }
      toast.success("Customer deleted.");
      router.push(`/${orgId}/customers`);
      router.refresh();
    });
  };

  return (
    <Button type="button" variant="destructive" onClick={onDelete} disabled={disabled || isPending}>
      <Trash2 className="size-4" />
      {isPending ? "Deleting..." : "Delete customer"}
    </Button>
  );
}
