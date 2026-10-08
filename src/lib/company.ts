import type { Company, NewCompany } from "./types";

// Keep these keys in sync with the company indexes in supabase/schema.sql.
export function companyWebsiteKey(value = ""): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].replace(/:443$|:80$/, "");
}

export function companyLinkedinKey(value = ""): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[?#]/)[0].replace(/\/+$/, "").replace(/^(linkedin\.com\/company\/[^/]+)\/.*$/, "$1");
}

export function companyNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export const COMPANY_DUPLICATE_MESSAGE =
  "This company is already tracked by the team. Edit the existing company instead.";

export function findCompanyDuplicate(
  rows: Company[],
  input: Pick<NewCompany, "company_name" | "website_url" | "linkedin_url">,
  excludeId?: string,
): Company | undefined {
  const website = companyWebsiteKey(input.website_url);
  const linkedin = companyLinkedinKey(input.linkedin_url);
  const name = companyNameKey(input.company_name);
  return rows.find((row) => row.id !== excludeId && (
    (website && website === companyWebsiteKey(row.website_url)) ||
    (linkedin && linkedin === companyLinkedinKey(row.linkedin_url)) ||
    (!website && !linkedin && !companyWebsiteKey(row.website_url) &&
      !companyLinkedinKey(row.linkedin_url) && name === companyNameKey(row.company_name))
  ));
}
