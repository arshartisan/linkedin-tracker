"use client";

import { useMemo } from "react";
import { useData } from "@/components/DataProvider";
import { AddUpwork } from "@/components/AddConnect";
import { ConnectRow } from "@/components/ConnectRow";
import { EmptyState, Page, PageHeader, SectionHeading } from "@/components/ui/layout";

export default function UpworkPage() {
  const { mine, loading } = useData();
  const jobs = useMemo(() => mine.filter((connect) => Boolean(connect.upwork_url)), [mine]);

  return (
    <Page>
      <PageHeader
        title="Upwork"
        lead="Track each Upwork job, the client you researched, and every approach already sent."
      />
      <div className="flex flex-col gap-6">
        <AddUpwork />
        <section>
          <SectionHeading count={jobs.length}>Tracked jobs</SectionHeading>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : jobs.length === 0 ? (
            <EmptyState title="No Upwork jobs logged yet.">
              Paste an Upwork job link above to start a client record.
            </EmptyState>
          ) : (
            <ul className="grid gap-2 xl:grid-cols-2">
              {jobs.map((job, index) => (
                <ConnectRow key={job.id} connect={job} index={index} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
