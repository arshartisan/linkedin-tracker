"use client";

import { useMemo, useState } from "react";
import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react";
import { AddCompany } from "@/components/AddConnect";
import { CompanyRow } from "@/components/CompanyRow";
import { useData } from "@/components/DataProvider";
import { EmptyState, Page, PageHeader, Chip, FIELD } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { COMPANY_OUTREACH_CHANNEL_LABEL, type CompanyOutreachChannel } from "@/lib/types";

export default function CompaniesPage() {
  const { companies, me, loading } = useData();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<CompanyOutreachChannel | "all">("all");
  const [sort, setSort] = useState("newest");
  const [adding, setAdding] = useState(false);
  const mine = useMemo(
    () => companies.filter((company) => company.owner === me.id),
    [companies, me.id]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mine.filter((company) =>
      (channel === "all" || company.outreach_channels.includes(channel)) &&
      [company.company_name, company.email, company.website_url, company.note].some((value) => value.toLowerCase().includes(query))
    ).sort((a, b) => sort === "name" ? a.company_name.localeCompare(b.company_name) : b.created_at.localeCompare(a.created_at));
  }, [mine, search, channel, sort]);

  return (
    <Page>
      <PageHeader
        title="Companies"
        lead="Manage your company pipeline and outreach."
        actions={<><Chip>{mine.length} companies</Chip><Button onClick={() => setAdding(!adding)} aria-expanded={adding} aria-controls="add-company"><PlusIcon />{adding ? "Close form" : "Add company"}</Button></>}
      />
      <div className="flex flex-col gap-4">
        {adding && <div id="add-company"><AddCompany /></div>}
        <section className="overflow-hidden rounded-card border border-line-soft" aria-label="Tracked companies">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft p-3">
            <div className="relative min-w-40 flex-1 sm:max-w-72">
              <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
              <input aria-label="Search companies" placeholder="Search companies…" value={search} onChange={(event) => setSearch(event.target.value)} className={`${FIELD} h-8 py-0 pl-8 text-xs`} />
            </div>
            <select aria-label="Filter by outreach channel" value={channel} onChange={(event) => setChannel(event.target.value as CompanyOutreachChannel | "all")} className={`${FIELD} h-8 w-auto py-0 text-xs`}>
              <option value="all">All channels</option>
              {(Object.keys(COMPANY_OUTREACH_CHANNEL_LABEL) as CompanyOutreachChannel[]).map((value) => <option key={value} value={value}>{COMPANY_OUTREACH_CHANNEL_LABEL[value]}</option>)}
            </select>
            <select aria-label="Sort companies" value={sort} onChange={(event) => setSort(event.target.value)} className={`${FIELD} h-8 w-auto py-0 text-xs sm:ml-auto`}>
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          {loading ? (
            <p role="status" className="p-6 text-sm text-muted">Loading companies…</p>
          ) : mine.length === 0 ? (
            <div className="px-6 py-12 text-center"><Building2Icon aria-hidden className="mx-auto mb-3 size-7 text-muted" /><p className="text-sm font-medium">Your company pipeline starts here</p><p className="mt-1 text-xs text-muted">Add a company to track its contacts and outreach.</p><Button className="mt-4" onClick={() => setAdding(true)}><PlusIcon />Add company</Button></div>
          ) : filtered.length === 0 ? (
            <div className="p-4"><EmptyState title="No matching companies">Try another search or outreach channel.</EmptyState><Button variant="secondary" className="mt-3" onClick={() => { setSearch(""); setChannel("all"); }}>Clear filters</Button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <caption className="sr-only">Companies with contact details, outreach channels, and editing actions</caption>
                <thead className="border-b border-line-soft bg-well text-xs text-muted"><tr>{["Company", "Email", "Links", "Reached through", "Added", "Actions"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-normal">{heading}</th>)}</tr></thead>
                <tbody>{filtered.map((company) => <CompanyRow key={company.id} company={company} table />)}</tbody>
              </table>
            </div>
          )}
          <div aria-live="polite" className="border-t border-line-soft px-4 py-3 text-[11px] text-muted">{loading ? "Loading…" : `${filtered.length} of ${mine.length} companies`}</div>
        </section>
      </div>
    </Page>
  );
}
