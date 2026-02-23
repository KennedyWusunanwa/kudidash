import { listAccountsForSelect } from "@/lib/data/coa.data";
import { JournalEntryForm } from "@/components/forms/journal-entry-form";

export default async function NewJournalPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const accounts = await listAccountsForSelect(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create Journal Entry</h2>
        <p className="text-sm text-muted-foreground">
          Client-side validation checks debit/credit balance before submit. Database enforces it again on posting.
        </p>
      </div>
      <JournalEntryForm orgId={orgId} accountOptions={accounts} />
    </div>
  );
}
