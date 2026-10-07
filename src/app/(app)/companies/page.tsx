"use client";

import { useMemo } from "react";
import { AddCompany } from "@/components/AddConnect";
import { CompanyRow } from "@/components/CompanyRow";
import { useData } from "@/components/DataProvider";
import { EmptyState, Page, PageHeader, SectionHeading } from "@/components/ui/layout";

export default function CompaniesPage() {
  const { companies, me, loading } = useData();
  const mine = useMemo(
    () => companies.filter((company) => company.owner === me.id),
    [companies, me.id]
  );

  return (
    <Page>
      <PageHeader
        title="Companies"
        lead="Track companies, their contact details, and every channel used to reach them."
      />
      <div className="flex flex-col gap-6">
        <AddCompany />
        <section>
          <SectionHeading count={mine.length}>Tracked companies</SectionHeading>
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : mine.length === 0 ? (
            <EmptyState title="No companies logged yet.">
              Add a company above to start tracking outreach.
            </EmptyState>
          ) : (
            <ul className="grid gap-2 xl:grid-cols-2">
              {mine.map((company, index) => (
                <CompanyRow key={company.id} company={company} index={index} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
