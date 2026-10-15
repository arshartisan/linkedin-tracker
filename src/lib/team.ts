import { dayKey } from "./date";
import { USER_IDS, type Company, type Connect, type UserId } from "./types";

/** A linked client profile on an Upwork job is research, not another invite. */
export function linkedinConnects(rows: Connect[]): Connect[] {
  return rows.filter((row) => !row.upwork_url);
}

export function teamActivity(connects: Connect[], companies: Company[], since: string, until: string, owner: UserId | "all" = "all") {
  const inRange = (day: string) => day >= since && day <= until;
  return USER_IDS.filter((id) => owner === "all" || id === owner).map((id) => {
    const rows = connects.filter((row) => row.owner === id && inRange(row.sent_on));
    const jobs = rows.filter((row) => Boolean(row.upwork_url));
    const firms = companies.filter((row) => row.owner === id && inRange(dayKey(new Date(row.created_at))));
    return {
      id,
      linkedin: linkedinConnects(rows).length,
      jobs: jobs.length,
      jobsReached: jobs.filter((row) => row.outreach_channels.length > 0).length,
      companies: firms.length,
      companiesReached: firms.filter((row) => row.outreach_channels.length > 0).length,
    };
  });
}
