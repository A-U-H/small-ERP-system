export const LEAD_STATUSES = [
  { value: "NEW", label: "New", color: "bg-slate-100 text-slate-700" },
  { value: "CONTACTED", label: "Contacted", color: "bg-blue-100 text-blue-700" },
  { value: "QUALIFIED", label: "Qualified", color: "bg-violet-100 text-violet-700" },
  { value: "PROPOSAL_SENT", label: "Proposal sent", color: "bg-amber-100 text-amber-700" },
  { value: "WON", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { value: "CONVERTED", label: "Converted", color: "bg-emerald-100 text-emerald-700" },
  { value: "LOST", label: "Lost", color: "bg-rose-100 text-rose-700" },
  { value: "UNQUALIFIED", label: "Unqualified", color: "bg-rose-100 text-rose-700" },
] as const;

export const LEAD_STATUS_MAP = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof LEAD_STATUSES)[number]>;

export const LEAD_SOURCES = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "COLD_CALL", label: "Cold call" },
  { value: "SOCIAL_MEDIA", label: "Social media" },
  { value: "EVENT", label: "Event" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "OTHER", label: "Other" },
];

export const DEAL_STAGES = [
  { value: "LEAD", label: "Lead", color: "bg-slate-100 text-slate-700" },
  { value: "QUALIFIED", label: "Qualified", color: "bg-blue-100 text-blue-700" },
  { value: "PROPOSAL_SENT", label: "Proposal sent", color: "bg-amber-100 text-amber-700" },
  { value: "NEGOTIATION", label: "Negotiation", color: "bg-violet-100 text-violet-700" },
  { value: "WON", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { value: "LOST", label: "Lost", color: "bg-rose-100 text-rose-700" },
] as const;

export const DEAL_STAGE_MAP = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s]),
) as Record<string, (typeof DEAL_STAGES)[number]>;

export const PROPOSAL_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { value: "REJECTED", label: "Rejected", color: "bg-rose-100 text-rose-700" },
  { value: "EXPIRED", label: "Expired", color: "bg-amber-100 text-amber-700" },
] as const;

export const PROPOSAL_STATUS_MAP = Object.fromEntries(
  PROPOSAL_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof PROPOSAL_STATUSES)[number]>;

export const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "SIGNED", label: "Signed", color: "bg-violet-100 text-violet-700" },
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { value: "TERMINATED", label: "Terminated", color: "bg-rose-100 text-rose-700" },
] as const;

export const CONTRACT_STATUS_MAP = Object.fromEntries(
  CONTRACT_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof CONTRACT_STATUSES)[number]>;

export const BILLING_TYPES = [
  { value: "FIXED", label: "Fixed price" },
  { value: "HOURLY", label: "Hourly" },
  { value: "RETAINER", label: "Monthly retainer" },
];

export const FOLLOW_UP_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MEETING", label: "Meeting" },
];

export const FOLLOW_UP_TYPE_MAP = Object.fromEntries(
  FOLLOW_UP_TYPES.map((s) => [s.value, s.label]),
) as Record<string, string>;

export const COMPANY_STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "INACTIVE", label: "Inactive", color: "bg-slate-100 text-slate-700" },
  { value: "LEAD", label: "Lead", color: "bg-blue-100 text-blue-700" },
  { value: "POTENTIAL", label: "Potential", color: "bg-violet-100 text-violet-700" },
];

export const COMPANY_STATUS_MAP = Object.fromEntries(
  COMPANY_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof COMPANY_STATUSES)[number]>;

export { Badge } from "@/components/ui/badge";
