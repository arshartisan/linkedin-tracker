"use client";

import { useMemo, useState } from "react";
import { ArrowDownUpIcon, Building2Icon, FilterIcon, PlusIcon, SearchIcon } from "lucide-react";
import { AddCompany } from "@/components/AddConnect";
import { CompanyRow } from "@/components/CompanyRow";
import { useData } from "@/components/DataProvider";
import { EmptyState, Page, PageHeader, Chip } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import * as Select from "@/components/ui/select";
import { COMPANY_OUTREACH_CHANNEL_LABEL, type CompanyOutreachChannel } from "@/lib/types";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const { companies, me, loading } = useData();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<CompanyOutreachChannel | "all">("all");
  const [sort, setSort] = useState("newest");
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
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
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleCompanies = filtered.slice(start, start + PAGE_SIZE);
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)
    .filter((number) => pageCount <= 7 || number === 1 || number === pageCount || Math.abs(number - currentPage) <= 1);

  function changePage(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, pageCount)));
  }

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
          <div className="flex flex-col gap-3 border-b border-line-soft p-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72 sm:shrink-0">
              <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
              <Input aria-label="Search companies" placeholder="Search companies…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-9 rounded-control border-line-soft bg-well pl-8 text-xs md:text-xs" />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-1">
              <Select.Root value={channel} onValueChange={(value) => { setChannel(value as CompanyOutreachChannel | "all"); setPage(1); }}>
                <Select.Trigger aria-label="Filter by outreach channel">
                  <FilterIcon aria-hidden className="size-3.5 shrink-0 text-muted" />
                  <Select.Value />
                </Select.Trigger>
                <Select.Content align="start" className="min-w-48">
                  <Select.Group>
                    <Select.GroupLabel>Outreach channel</Select.GroupLabel>
                    <Select.Item value="all">All channels</Select.Item>
                    {(Object.keys(COMPANY_OUTREACH_CHANNEL_LABEL) as CompanyOutreachChannel[]).map((value) => (
                      <Select.Item key={value} value={value}>{COMPANY_OUTREACH_CHANNEL_LABEL[value]}</Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
              <div className="sm:ml-auto">
                <Select.Root value={sort} onValueChange={(value) => { setSort(value); setPage(1); }}>
                  <Select.Trigger aria-label="Sort companies">
                    <ArrowDownUpIcon aria-hidden className="size-3.5 shrink-0 text-muted" />
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content align="end" className="min-w-44">
                    <Select.Group>
                      <Select.GroupLabel>Sort companies</Select.GroupLabel>
                      <Select.Item value="newest">Newest first</Select.Item>
                      <Select.Item value="name">Name A–Z</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </div>
          {loading ? (
            <p role="status" className="p-6 text-sm text-muted">Loading companies…</p>
          ) : mine.length === 0 ? (
            <div className="px-6 py-12 text-center"><Building2Icon aria-hidden className="mx-auto mb-3 size-7 text-muted" /><p className="text-sm font-medium">Your company pipeline starts here</p><p className="mt-1 text-xs text-muted">Add a company to track its contacts and outreach.</p><Button className="mt-4" onClick={() => setAdding(true)}><PlusIcon />Add company</Button></div>
          ) : filtered.length === 0 ? (
            <div className="p-4"><EmptyState title="No matching companies">Try another search or outreach channel.</EmptyState><Button variant="secondary" className="mt-3" onClick={() => { setSearch(""); setChannel("all"); setPage(1); }}>Clear filters</Button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <caption className="sr-only">Companies with contact details, outreach channels, and editing actions</caption>
                <thead className="border-b border-line-soft bg-well text-xs text-muted"><tr>{["Company", "Email", "Links", "Reached through", "Added", "Actions"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-normal">{heading}</th>)}</tr></thead>
                <tbody>{visibleCompanies.map((company) => <CompanyRow key={company.id} company={company} table />)}</tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-line-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" aria-atomic="true" className="text-[11px] text-muted">
              {loading ? "Loading…" : filtered.length === 0 ? `0 of ${mine.length} companies` : `${start + 1}–${start + visibleCompanies.length} of ${filtered.length} companies${filtered.length !== mine.length ? ` (${mine.length} total)` : ""}`}
            </p>
            {!loading && filtered.length > 0 && (
              <Pagination aria-label="Companies pagination" className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={currentPage > 1 ? "#" : undefined}
                      aria-disabled={currentPage === 1}
                      tabIndex={currentPage === 1 ? -1 : undefined}
                      className="h-8 rounded-control shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-40"
                      onClick={(event) => { event.preventDefault(); changePage(currentPage - 1); }}
                    />
                  </PaginationItem>
                  {pageNumbers.map((number, index) => (
                    <PaginationItem key={number} className="flex items-center gap-1">
                      {index > 0 && number - pageNumbers[index - 1] > 1 && <PaginationEllipsis className="size-8" />}
                      <PaginationLink
                        href="#"
                        isActive={number === currentPage}
                        aria-label={`Go to page ${number}`}
                        className="size-8 rounded-control text-xs shadow-none data-[active=true]:border data-[active=true]:border-line-soft"
                        onClick={(event) => { event.preventDefault(); changePage(number); }}
                      >
                        {number}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href={currentPage < pageCount ? "#" : undefined}
                      aria-disabled={currentPage === pageCount}
                      tabIndex={currentPage === pageCount ? -1 : undefined}
                      className="h-8 rounded-control shadow-none aria-disabled:pointer-events-none aria-disabled:opacity-40"
                      onClick={(event) => { event.preventDefault(); changePage(currentPage + 1); }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
