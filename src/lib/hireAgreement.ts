export type HireAttachments = {
  hydraulic_tilt_bucket: boolean;
  auger_100: boolean;
  auger_300: boolean;
  auger_450: boolean;
  auger_600: boolean;
  rock_breaker: boolean;
  hydraulic_grab: boolean;
  bucket_4in1: boolean;
  other: string;
};

export type HireDetails = {
  job_reference: string;
  site_address: string;
  site_contact: string;
  site_phone: string;
  quantity_notes: string;
  preferred_collection_time: string;
  preferred_return_time: string;
  additional_hire_charge: string;
  travel_float_fee: string;
  require_operator: boolean | null;
  operator_name: string;
  operator_rate: string;
  wet_weather: "charged" | "not_charged" | "";
  lcc_insurance: boolean | null;
  attachments: HireAttachments;
};

export const EMPTY_ATTACHMENTS: HireAttachments = {
  hydraulic_tilt_bucket: false,
  auger_100: false,
  auger_300: false,
  auger_450: false,
  auger_600: false,
  rock_breaker: false,
  hydraulic_grab: false,
  bucket_4in1: false,
  other: "",
};

export const EMPTY_HIRE_DETAILS: HireDetails = {
  job_reference: "",
  site_address: "",
  site_contact: "",
  site_phone: "",
  quantity_notes: "",
  preferred_collection_time: "",
  preferred_return_time: "",
  additional_hire_charge: "",
  travel_float_fee: "",
  require_operator: null,
  operator_name: "",
  operator_rate: "",
  wet_weather: "",
  lcc_insurance: null,
  attachments: { ...EMPTY_ATTACHMENTS },
};

export function normalizeHireDetails(raw: unknown): HireDetails {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<HireDetails>;
  const attachments = {
    ...EMPTY_ATTACHMENTS,
    ...(d.attachments || {}),
  };
  return {
    ...EMPTY_HIRE_DETAILS,
    ...d,
    attachments,
  };
}

export function hireDetailsFromFormData(fd: FormData): HireDetails {
  const bool = (key: string) => fd.get(key) === "on" || fd.get(key) === "true";
  const yesNo = (key: string): boolean | null => {
    const v = String(fd.get(key) || "");
    if (v === "yes") return true;
    if (v === "no") return false;
    return null;
  };

  return {
    job_reference: String(fd.get("job_reference") || ""),
    site_address: String(fd.get("site_address") || ""),
    site_contact: String(fd.get("site_contact") || ""),
    site_phone: String(fd.get("site_phone") || ""),
    quantity_notes: String(fd.get("quantity_notes") || ""),
    preferred_collection_time: String(fd.get("preferred_collection_time") || ""),
    preferred_return_time: String(fd.get("preferred_return_time") || ""),
    additional_hire_charge: String(fd.get("additional_hire_charge") || ""),
    travel_float_fee: String(fd.get("travel_float_fee") || ""),
    require_operator: yesNo("require_operator"),
    operator_name: String(fd.get("operator_name") || ""),
    operator_rate: String(fd.get("operator_rate") || ""),
    wet_weather: (String(fd.get("wet_weather") || "") as HireDetails["wet_weather"]),
    lcc_insurance: yesNo("lcc_insurance"),
    attachments: {
      hydraulic_tilt_bucket: bool("att_hydraulic_tilt_bucket"),
      auger_100: bool("att_auger_100"),
      auger_300: bool("att_auger_300"),
      auger_450: bool("att_auger_450"),
      auger_600: bool("att_auger_600"),
      rock_breaker: bool("att_rock_breaker"),
      hydraulic_grab: bool("att_hydraulic_grab"),
      bucket_4in1: bool("att_bucket_4in1"),
      other: String(fd.get("att_other") || ""),
    },
  };
}

export function selectedAttachmentsLabel(a: HireAttachments): string {
  const labels: string[] = [];
  if (a.hydraulic_tilt_bucket) labels.push("Hydraulic Tilt Bucket");
  if (a.auger_100) labels.push("Auger 100mm");
  if (a.auger_300) labels.push("Auger 300mm");
  if (a.auger_450) labels.push("Auger 450mm");
  if (a.auger_600) labels.push("Auger 600mm");
  if (a.rock_breaker) labels.push("Rock Breaker");
  if (a.hydraulic_grab) labels.push("Hydraulic Grab");
  if (a.bucket_4in1) labels.push("4 in 1 Bucket");
  if (a.other.trim()) labels.push(`Other: ${a.other.trim()}`);
  return labels.length ? labels.join(", ") : "None selected";
}

export const HIRE_TERMS_TEXT = `Minimum Hire:
4 Hours – Wet Hire | 1 Day – Dry Hire

Off-Hire Notification:
The Hirer must provide written notice of off-hire prior to 9:00 AM on the final day of hire. Failure to notify Champion Equipment by this time will result in an additional full day's hire charge.

Fuel Policy:
Refuelling will be charged at a rate of $3.00 per litre OR $1.00 above the current local pump price (whichever is greater) to cover fuel costs and labour.

Damage Responsibility:
The Client is liable for any damage outside of fair wear and tear.

Cancellations:
24 hours' notice required, or a cancellation fee applies.`;

export const SAFETY_TERMS_TEXT = `• The Client must ensure safe site access and working conditions.
• Underground services must be clearly marked or identified before work begins.
• Machine must not be operated by anyone other than the designated operator (unless agreed).

LCC means Loss, Damage, or Cost coverage for the hired Equipment. If the Hirer does not have LCC insurance, coverage can be provided by Champion Equipment at 10% of the total hire price.

Payment Due: Prior to hire.`;
