export type ConnectStatus = "pending" | "accepted" | "ignored";

export type Connect = {
  id: string;
  /** Local calendar day the connect was sent, as YYYY-MM-DD. */
  sent_on: string;
  created_at: string;
  profile_url: string;
  name: string;
  status: ConnectStatus;
  note: string;
  tags: string[];
};

export type NewConnect = {
  profile_url: string;
  name: string;
  note?: string;
  tags?: string[];
  sent_on?: string;
};

export const STATUSES: ConnectStatus[] = ["pending", "accepted", "ignored"];

export const STATUS_LABEL: Record<ConnectStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  ignored: "Ignored",
};
