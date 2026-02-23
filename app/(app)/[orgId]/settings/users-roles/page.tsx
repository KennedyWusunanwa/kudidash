import { listOrgMembers } from "@/lib/data/org.data";
import { AddMemberForm } from "@/components/forms/member-role-form";
import { UsersRolesTable } from "@/components/tables/users-roles-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function UsersRolesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
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
          <CardTitle className="text-base">Add member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm orgId={orgId} />
          <p className="mt-3 text-xs text-muted-foreground">
            UNSPECIFIED: User invitation workflow/email invite token. Current scaffold accepts existing `auth.users` UUID.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current members</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersRolesTable orgId={orgId} members={members as never[]} />
        </CardContent>
      </Card>
    </div>
  );
}
