"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { AddUpwork } from "@/components/AddConnect";
import { ConnectRow } from "@/components/ConnectRow";
import { EmptyState, Page, PageHeader, SectionHeading } from "@/components/ui/layout";
import { MemberFilter, type MemberScope } from "@/components/MemberFilter";
import { ClientTypeSelect } from "@/components/ClientTypeSelect";
import { Button } from "@/components/ui/button";
import type { ClientType } from "@/lib/types";

export default function UpworkPage() {
  const { connects, loading } = useData();
  const [owner, setOwner] = useState<MemberScope>("all");
  const [clientType, setClientType] = useState<ClientType | "all">("all");
  const jobs = useMemo(() => connects.filter((connect) => Boolean(connect.upwork_url)), [connects]);
  const filtered = jobs.filter((job) => (owner === "all" || job.owner === owner) && (clientType === "all" || job.client_type === clientType));

  return (
    <Page>
      <PageHeader
        title="Upwork"
        lead="Track each Upwork job, the client you researched, and every approach already sent."
      />
      <div className="flex flex-col gap-6">
        <AddUpwork />
        <div className="flex flex-wrap items-center gap-2" aria-label="Job filters">
          <MemberFilter value={owner} onChange={setOwner} />
          <ClientTypeSelect value={clientType} onChange={setClientType} filter />
          {(owner !== "all" || clientType !== "all") && <Button variant="ghost" size="sm" onClick={() => { setOwner("all"); setClientType("all"); }}>Clear filters</Button>}
          <p aria-live="polite" className="text-xs text-muted sm:ml-auto">{filtered.length} of {jobs.length} jobs</p>
        </div>
        <section>
          <SectionHeading count={filtered.length}>Tracked jobs</SectionHeading>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : jobs.length === 0 ? (
            <EmptyState title="No Upwork jobs logged yet.">
              Paste an Upwork job link above to start a client record.
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState title="No matching jobs">Try another team member or client type.</EmptyState>
          ) : (
            <ul className="grid gap-2 xl:grid-cols-2">
              {filtered.map((job, index) => (
                <ConnectRow key={job.id} connect={job} index={index} showOwner showAction={false} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
