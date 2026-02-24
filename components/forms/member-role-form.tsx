"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  addMemberAction,
  createManagedUserAction,
  disableMemberAction,
  setMemberPasswordAction,
  updateMemberRoleAction,
} from "@/lib/actions/org.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const ROLE_OPTIONS = ["owner", "admin", "accountant", "approver", "viewer"] as const;

const addMemberSchema = z.object({
  user_id: z.string().uuid("Use an existing auth user UUID"),
  role: z.enum(ROLE_OPTIONS),
});

type AddMemberInput = z.infer<typeof addMemberSchema>;

const createManagedUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().trim().max(120).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLE_OPTIONS),
});

type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;

export function CreateManagedUserForm({
  orgId,
  canManageMembers,
}: {
  orgId: string;
  canManageMembers: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateManagedUserInput>({
    resolver: zodResolver(createManagedUserSchema),
    defaultValues: { email: "", full_name: "", password: "", role: "viewer" },
  });

  const onSubmit = (values: CreateManagedUserInput) => {
    startTransition(async () => {
      const result = await createManagedUserAction({ orgId, ...values });
      if (!result.success) {
        toast.error(result.error || "Failed to create user.");
        return;
      }
      toast.success("User account created and added to this organization.");
      form.reset({ email: "", full_name: "", password: "", role: "viewer" });
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="staff@company.com"
                  {...(field as any)}
                  disabled={!canManageMembers || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Jane Doe"
                  {...(field as any)}
                  disabled={!canManageMembers || isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temporary password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  {...(field as any)}
                  disabled={!canManageMembers || isPending}
                />
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
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canManageMembers || isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
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
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending || !canManageMembers}>
            {isPending ? "Creating..." : "Create account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function AddMemberForm({
  orgId,
  canManageMembers,
}: {
  orgId: string;
  canManageMembers: boolean;
}) {
  const router = useRouter();
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
      router.refresh();
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
                <Input
                  placeholder="auth.users UUID"
                  {...(field as any)}
                  disabled={!canManageMembers || isPending}
                />
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
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canManageMembers || isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
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
          <Button type="submit" disabled={isPending || !canManageMembers}>
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
  canManageMembers,
}: {
  orgId: string;
  member: { user_id: string; role: string; is_active: boolean };
  canManageMembers: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        defaultValue={member.role}
        disabled={!canManageMembers || isPending}
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
            router.refresh();
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((role) => (
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
        disabled={isPending || !member.is_active || !canManageMembers}
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
            router.refresh();
          })
        }
      >
        Disable
      </Button>
      <ResetMemberPasswordDialog
        orgId={orgId}
        userId={member.user_id}
        disabled={!canManageMembers}
      />
    </div>
  );
}

function ResetMemberPasswordDialog({
  orgId,
  userId,
  disabled,
}: {
  orgId: string;
  userId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Set password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set account password</DialogTitle>
          <DialogDescription>
            Assign a new password for this user. Share it securely with the user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label htmlFor={`member-password-${userId}`} className="text-sm font-medium">
            New password
          </label>
          <Input
            id={`member-password-${userId}`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (password.trim().length < 8) {
                toast.error("Password must be at least 8 characters.");
                return;
              }
              startTransition(async () => {
                const result = await setMemberPasswordAction({
                  orgId,
                  user_id: userId,
                  password: password.trim(),
                });
                if (!result.success) {
                  toast.error(result.error || "Failed to set password.");
                  return;
                }
                toast.success("Password updated.");
                setPassword("");
                setOpen(false);
              });
            }}
          >
            {isPending ? "Saving..." : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

