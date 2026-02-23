import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberRoleInlineActions } from "@/components/forms/member-role-form";

type MemberRow = {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  role: string;
  is_active: boolean;
};

export function UsersRolesTable({
  orgId,
  members,
}: {
  orgId: string;
  members: MemberRow[];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length ? (
            members.map((member) => (
              <TableRow key={member.user_id}>
                <TableCell className="font-medium">
                  {member.full_name || member.user_id.slice(0, 8)}
                </TableCell>
                <TableCell>{member.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={member.is_active ? "default" : "secondary"}>
                    {member.is_active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <MemberRoleInlineActions orgId={orgId} member={member} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
