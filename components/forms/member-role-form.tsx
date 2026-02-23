"use client";

import { useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  addMemberAction,
  disableMemberAction,
  updateMemberRoleAction,
} from "@/lib/actions/org.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const addMemberSchema = z.object({
  user_id: z.string().uuid("Use an existing auth user UUID"),
  role: z.enum(["owner", "admin", "accountant", "approver", "viewer"]),
});

type AddMemberInput = z.infer<typeof addMemberSchema>;

export function AddMemberForm({ orgId }: { orgId: string }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { user_id: "", role: "viewer" },
  });

  const onSubmit = (values: AddMemberInput) => {
    startTransition(async () => {
      const result = await addMemberAction({ orgId, ...values });
      if (!result.success) {
        toast.error(result.error || "Failed to add member.");
        return;
      }
      toast.success("Member added.");
      form.reset({ user_id: "", role: "viewer" });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-3">
        <FormField
          control={form.control}
          name="user_id"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>User UUID</FormLabel>
              <FormControl>
                <Input placeholder="auth.users UUID" {...(field as any)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["owner", "admin", "accountant", "approver", "viewer"].map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function MemberRoleInlineActions({
  orgId,
  member,
}: {
  orgId: string;
  member: { user_id: string; role: string; is_active: boolean };
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={member.role}
        onValueChange={(role) =>
          startTransition(async () => {
            const result = await updateMemberRoleAction({
              orgId,
              user_id: member.user_id,
              role: role as AddMemberInput["role"],
            });
            if (!result.success) {
              toast.error(result.error || "Failed to update role.");
              return;
            }
            toast.success("Role updated.");
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {["owner", "admin", "accountant", "approver", "viewer"].map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !member.is_active}
        onClick={() =>
          startTransition(async () => {
            const result = await disableMemberAction({
              orgId,
              user_id: member.user_id,
            });
            if (!result.success) {
              toast.error(result.error || "Failed to disable member.");
              return;
            }
            toast.success("Member disabled.");
          })
        }
      >
        Disable
      </Button>
    </div>
  );
}

