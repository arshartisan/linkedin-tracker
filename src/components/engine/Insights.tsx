"use client";

import { Stat } from "@/components/ui/layout";
import { FEEDBACK_LABEL, FEEDBACK_VERDICTS, stepDone, type EngineJobSummary, type EngineLead } from "@/lib/engine";

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

/** One horizontal bar per row, all on the same scale. Values are counts. */
function Bars({ title, rows, note }: { title: string; rows: { label: string; value: number; hint?: string }[]; note?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card p-4">
      <h3 className="label mb-3">{title}</h3>
      <table className="w-full border-separate border-spacing-y-1.5 text-xs">
        <caption className="sr-only">{title}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="w-[1%] whitespace-nowrap pr-3 text-left font-normal text-muted">{r.label}</th>
              <td>
                <div className="h-2 rounded-full bg-line-soft">
                  <div className="h-full rounded-full bg-brand-dim" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0 }} />
                </div>
              </td>
              <td className="w-[1%] whitespace-nowrap pl-3 text-right tabular-nums">{r.value}</td>
              <td className="w-[1%] whitespace-nowrap pl-2 text-right tabular-nums text-muted">{r.hint ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-2 text-[11px] text-muted">{note}</p>}
    </section>
  );
}

/** How well the engine is doing: the funnel, lead outcomes, ratings and Claude usage. */
export function Insights({ jobs, leads }: { jobs: EngineJobSummary[]; leads: EngineLead[] }) {
  const real = jobs.filter((j) => !j.duplicate_note);
  const analysed = real.filter((j) => stepDone(j.stage, "analyse"));
  const researched = real.filter((j) => stepDone(j.stage, "enrich"));
  const identified = researched.filter((j) => j.identified === "true");
  const withEmail = real.filter((j) => j.email);
  const drafted = real.filter((j) => stepDone(j.stage, "draft"));
  const sent = real.filter((j) => j.stage === "sent");

  const cost = (j: EngineJobSummary) => Number(j.cost_analyse || 0) + Number(j.cost_enrich || 0) + Number(j.cost_draft || 0);
  const costed = real.filter((j) => cost(j) > 0);
  const totalCost = costed.reduce((n, j) => n + cost(j), 0);

  const reachable = leads.filter((l) => l.channels.email || l.channels.linkedin || l.channels.contact_form || l.channels.x);
  const jobsWithLeadOnly = new Set(leads.map((l) => l.job_key));
  const rescued = researched.filter((j) => !j.email && jobsWithLeadOnly.has(j.job_key)).length;
  const rated = real.filter((j) => j.verdict);
  const tiers = ["A", "B", "C", "D", "New"].map((t) => ({ label: t === "New" ? "New client" : `Tier ${t}`, value: analysed.filter((j) => j.tier === t).length }));

  return (
    <div className="flex flex-col gap-4">
      <section className="card grid grid-cols-2 gap-5 p-4 sm:grid-cols-4">
        <Stat value={pct(identified.length, researched.length)} caption="Company identified" />
        <Stat value={pct(withEmail.length, researched.length)} caption="Email found" />
        <Stat value={rescued} caption="No email, but leads found" tone={rescued ? "brand" : "text"} />
        <Stat value={costed.length ? `$${(totalCost / costed.length).toFixed(2)}` : "–"} caption="Claude usage per job" />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Bars title="Pipeline" rows={[
          { label: "Collected", value: real.length },
          { label: "Analysed", value: analysed.length, hint: pct(analysed.length, real.length) },
          { label: "Researched", value: researched.length, hint: pct(researched.length, real.length) },
          { label: "Company identified", value: identified.length, hint: pct(identified.length, real.length) },
          { label: "Email found", value: withEmail.length, hint: pct(withEmail.length, real.length) },
          { label: "Email drafted", value: drafted.length, hint: pct(drafted.length, real.length) },
          { label: "Sent", value: sent.length, hint: pct(sent.length, real.length) },
        ]} note="Percentages are of all collected jobs. Jobs already in the manual pipeline are left out." />

        <Bars title="Leads found during research" rows={[
          { label: "Found", value: leads.length },
          { label: "With a way to reach them", value: reachable.length, hint: pct(reachable.length, leads.length) },
          { label: "Checked", value: leads.filter((l) => l.status !== "new" && l.status !== "dismissed").length },
          { label: "Contacted", value: leads.filter((l) => l.status === "contacted" || l.status === "replied").length },
          { label: "Replied", value: leads.filter((l) => l.status === "replied").length },
          { label: "Dismissed", value: leads.filter((l) => l.status === "dismissed").length },
        ]} />

        <Bars title="Clients by score" rows={tiers} note="Tier A is 75 and above, B 55–74, C 35–54, D below 35. New clients have no spend or reviews yet." />

        <Bars title={`Your ratings (${rated.length} of ${researched.length} researched jobs)`}
          rows={FEEDBACK_VERDICTS.map((v) => ({ label: FEEDBACK_LABEL[v], value: rated.filter((j) => j.verdict === v).length }))}
          note="Rate results at the bottom of a job. These show where the research or the email needs tuning." />
      </div>

      <p className="text-[11px] text-muted">
        Claude usage is what the same calls would cost on the API ({costed.length ? `$${totalCost.toFixed(2)} across ${costed.length} jobs` : "no data yet"}).
        On a subscription it is a measure of how much of the plan a job uses, not a bill.
      </p>
    </div>
  );
}
