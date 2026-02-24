import { listOrgMembers, requireOrgMembership } from "@/lib/data/org.data";
import { AddMemberForm, CreateManagedUserForm } from "@/components/forms/member-role-form";
import { UsersRolesTable } from "@/components/tables/users-roles-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleHasPermission } from "@/lib/permissions";

export default async function UsersRolesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const membership = await requireOrgMembership(orgId);
  const canManageMembers = roleHasPermission(membership.role, "org.members.manage");
  const members = await listOrgMembers(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Users & Roles</h2>
        <p className="text-sm text-muted-foreground">
          Manage org membership and role assignments (`owner`, `admin`, `accountant`, `approver`, `viewer`).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create user account</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateManagedUserForm orgId={orgId} canManageMembers={canManageMembers} />
          <p className="mt-3 text-xs text-muted-foreground">
            Create a Supabase auth user with a password and add them to this organization in one
            step. Self sign-up can stay disabled.
          </p>
          {!canManageMembers ? (
            <p className="mt-2 text-xs text-amber-600">
              Only owners and admins can create accounts or assign roles.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add existing user by UUID</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm orgId={orgId} canManageMembers={canManageMembers} />
          <p className="mt-3 text-xs text-muted-foreground">
            Use this only when the user already exists in Supabase Auth and you just need to add
            them to this organization.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current members</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersRolesTable
            orgId={orgId}
            members={members as never[]}
            canManageMembers={canManageMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
