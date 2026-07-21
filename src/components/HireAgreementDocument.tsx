"use client";

import type { ReactNode } from "react";
import { Field, inputClass } from "@/components/ui";
import {
  HIRE_TERMS_TEXT,
  SAFETY_TERMS_TEXT,
  type HireDetails,
} from "@/lib/hireAgreement";
import { money, shortDate } from "@/lib/format";

export type HireAgreementValues = {
  // Auto-filled / display
  businessName: string;
  businessAbn: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  clientBusiness: string;
  clientContact: string;
  clientPhone: string;
  clientEmail: string;
  equipmentName: string;
  dayRate: number;
  pickupDate: string;
  dropoffDate: string;
  // Fillable
  details: HireDetails;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-brand-black px-4 py-2">
        <h3 className="text-sm font-semibold text-brand-yellow">{title}</h3>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-brand-green">
        {label}
      </div>
      <div className="mt-0.5 min-h-[1.5rem] border-b border-dotted border-neutral-300 pb-1 text-brand-black">
        {value || "—"}
      </div>
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
  readOnly,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-brand-black">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={readOnly}
        className="accent-brand-yellow"
      />
      {label}
    </label>
  );
}

/**
 * Fillable Machine Hire Agreement matching the Champion Equipment PDF layout.
 * Auto-filled fields come from client/equipment/booking; the rest are editable.
 */
export function HireAgreementDocument({
  values,
  mode,
  namePrefix = "",
}: {
  values: HireAgreementValues;
  mode: "edit" | "readonly" | "accept";
  namePrefix?: string;
}) {
  const readOnly = mode === "readonly";
  const d = values.details;
  const n = (name: string) => `${namePrefix}${name}`;

  return (
    <div className="space-y-4">
      <div className="border border-brand-black bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-brand-yellow pb-3">
          <div>
            <div className="text-lg font-bold text-brand-black">
              Machine Hire Agreement
            </div>
            <div className="text-sm font-semibold text-brand-black">
              {values.businessName}
            </div>
            <div className="mt-1 text-xs text-neutral-600">
              Craig R Champion — Sole Trader
              {values.businessAbn ? ` · ABN: ${values.businessAbn}` : " · ABN: TBC"}
            </div>
          </div>
          <div className="text-right text-xs text-neutral-600">
            {values.businessAddress ? <div>{values.businessAddress}</div> : null}
            <div>{values.businessPhone || "1800 673 922"}</div>
            <div>{values.businessEmail || "admin@championequipment.com.au"}</div>
          </div>
        </div>

        <div className="mt-4">
          {readOnly ? (
            <ReadRow label="Job Reference" value={d.job_reference} />
          ) : (
            <Field label="Job Reference">
              <input
                name={n("job_reference")}
                defaultValue={d.job_reference}
                className={inputClass}
                placeholder="Optional job / PO reference"
              />
            </Field>
          )}
        </div>
      </div>

      <Section title="1. Client Details">
        <div className="grid gap-3 md:grid-cols-2">
          <ReadRow label="Client / Business Name" value={values.clientBusiness} />
          <ReadRow label="Site Contact" value={
            mode === "readonly"
              ? d.site_contact || values.clientContact
              : values.clientContact
          } />
          <ReadRow label="Phone" value={values.clientPhone} />
          <ReadRow label="Email" value={values.clientEmail} />
        </div>
        {readOnly ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ReadRow label="Site Address" value={d.site_address} />
            <ReadRow label="Site Contact (on site)" value={d.site_contact} />
            <ReadRow label="Site Phone" value={d.site_phone} />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Site Address">
              <textarea
                name={n("site_address")}
                rows={2}
                defaultValue={d.site_address}
                className={inputClass}
                placeholder="Where the machine will be working"
              />
            </Field>
            <div className="space-y-3">
              <Field label="Site Contact">
                <input
                  name={n("site_contact")}
                  defaultValue={d.site_contact || values.clientContact}
                  className={inputClass}
                />
              </Field>
              <Field label="Site Phone">
                <input
                  name={n("site_phone")}
                  defaultValue={d.site_phone || values.clientPhone}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}
      </Section>

      <Section title="2. Hire Details">
        <div className="grid gap-3 md:grid-cols-2">
          <ReadRow label="Machine Description" value={values.equipmentName} />
          <ReadRow
            label="Daily Rate (ex. GST)"
            value={money(values.dayRate)}
          />
          <ReadRow label="Start Date" value={shortDate(values.pickupDate)} />
          <ReadRow label="End Date" value={shortDate(values.dropoffDate)} />
        </div>

        {readOnly ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ReadRow
              label="Preferred Collection Time"
              value={d.preferred_collection_time}
            />
            <ReadRow
              label="Preferred Return Time"
              value={d.preferred_return_time}
            />
            <ReadRow label="Quantity / Delivery Notes" value={d.quantity_notes} />
            <ReadRow
              label="Additional Hire Charge"
              value={d.additional_hire_charge}
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Preferred Collection Time">
              <input
                name={n("preferred_collection_time")}
                defaultValue={d.preferred_collection_time}
                className={inputClass}
                placeholder="e.g. 7:00 AM"
              />
            </Field>
            <Field label="Preferred Return Time">
              <input
                name={n("preferred_return_time")}
                defaultValue={d.preferred_return_time}
                className={inputClass}
                placeholder="e.g. 3:00 PM"
              />
            </Field>
            <Field label="Quantity / Delivery Notes">
              <textarea
                name={n("quantity_notes")}
                rows={2}
                defaultValue={d.quantity_notes}
                className={inputClass}
              />
            </Field>
            <Field label="Additional Hire Charge">
              <input
                name={n("additional_hire_charge")}
                defaultValue={d.additional_hire_charge}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-green">
            Attachments / Accessories not Included
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Check
              name={n("att_hydraulic_tilt_bucket")}
              label="Hydraulic Tilt Bucket"
              defaultChecked={d.attachments.hydraulic_tilt_bucket}
              readOnly={readOnly}
            />
            <Check
              name={n("att_auger_100")}
              label="Auger 100mm"
              defaultChecked={d.attachments.auger_100}
              readOnly={readOnly}
            />
            <Check
              name={n("att_auger_300")}
              label="Auger 300mm"
              defaultChecked={d.attachments.auger_300}
              readOnly={readOnly}
            />
            <Check
              name={n("att_auger_450")}
              label="Auger 450mm"
              defaultChecked={d.attachments.auger_450}
              readOnly={readOnly}
            />
            <Check
              name={n("att_auger_600")}
              label="Auger 600mm"
              defaultChecked={d.attachments.auger_600}
              readOnly={readOnly}
            />
            <Check
              name={n("att_rock_breaker")}
              label="Rock Breaker"
              defaultChecked={d.attachments.rock_breaker}
              readOnly={readOnly}
            />
            <Check
              name={n("att_hydraulic_grab")}
              label="Hydraulic Grab"
              defaultChecked={d.attachments.hydraulic_grab}
              readOnly={readOnly}
            />
            <Check
              name={n("att_bucket_4in1")}
              label="4 in 1 Bucket Included"
              defaultChecked={d.attachments.bucket_4in1}
              readOnly={readOnly}
            />
          </div>
          {readOnly ? (
            <div className="mt-2">
              <ReadRow label="Other" value={d.attachments.other} />
            </div>
          ) : (
            <div className="mt-3">
              <Field label="Other">
                <input
                  name={n("att_other")}
                  defaultValue={d.attachments.other}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {readOnly ? (
            <>
              <ReadRow
                label="Do you require an operator?"
                value={
                  d.require_operator === true
                    ? "Yes"
                    : d.require_operator === false
                      ? "No"
                      : "—"
                }
              />
              <ReadRow label="Operator Name" value={d.operator_name} />
              <ReadRow
                label="Operator Rate per hr"
                value={d.operator_rate ? `$${d.operator_rate}` : ""}
              />
            </>
          ) : (
            <>
              <Field label="Do you require an operator?">
                <select
                  name={n("require_operator")}
                  defaultValue={
                    d.require_operator === true
                      ? "yes"
                      : d.require_operator === false
                        ? "no"
                        : ""
                  }
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              <Field label="Operator Name">
                <input
                  name={n("operator_name")}
                  defaultValue={d.operator_name}
                  className={inputClass}
                />
              </Field>
              <Field label="Operator Rate per hr (if Yes)">
                <input
                  name={n("operator_rate")}
                  defaultValue={d.operator_rate}
                  className={inputClass}
                  placeholder="e.g. 85"
                />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Section title="3. Hire Terms">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
          {HIRE_TERMS_TEXT}
        </pre>
        {readOnly ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ReadRow label="Travel / Float Fee" value={d.travel_float_fee} />
            <ReadRow
              label="Wet Weather"
              value={
                d.wet_weather === "charged"
                  ? "Charged"
                  : d.wet_weather === "not_charged"
                    ? "Not Charged"
                    : "—"
              }
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Travel / Float Fee">
              <input
                name={n("travel_float_fee")}
                defaultValue={d.travel_float_fee}
                className={inputClass}
                placeholder="e.g. 350"
                inputMode="decimal"
              />
            </Field>
            <Field label="Wet Weather">
              <select
                name={n("wet_weather")}
                defaultValue={d.wet_weather}
                className={inputClass}
              >
                <option value="">Select…</option>
                <option value="charged">Charged</option>
                <option value="not_charged">Not Charged</option>
              </select>
            </Field>
          </div>
        )}
      </Section>

      <Section title="4. Safety & Site Conditions">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
          {SAFETY_TERMS_TEXT}
        </pre>
        {readOnly ? (
          <div className="mt-3">
            <ReadRow
              label="Do you have your own LCC insurance?"
              value={
                d.lcc_insurance === true
                  ? "Yes — own cover"
                  : d.lcc_insurance === false
                    ? "No — Champion Equipment LCC at 10% of hire"
                    : "—"
              }
            />
          </div>
        ) : (
          <div className="mt-3">
            <Field label="Do you have your own LCC insurance?">
              <select
                name={n("lcc_insurance")}
                defaultValue={
                  d.lcc_insurance === true
                    ? "yes"
                    : d.lcc_insurance === false
                      ? "no"
                      : ""
                }
                className={inputClass}
              >
                <option value="">Select…</option>
                <option value="yes">Yes — I have my own cover</option>
                <option value="no">
                  No — Champion Equipment LCC at 10% of hire
                </option>
              </select>
            </Field>
            <p className="mt-1 text-xs text-neutral-500">
              LCC means Loss, Damage, or Cost coverage. If you do not have LCC
              insurance, Champion Equipment can provide cover at 10% of the hire
              price (plus GST).
            </p>
          </div>
        )}
      </Section>

      <Section title="5. Payment Terms">
        <p className="text-sm text-brand-black">
          <strong>Payment Due:</strong> Prior to hire
        </p>
      </Section>

      {mode === "accept" ? (
        <Section title="6. Signatures — Client Acceptance">
          <p className="text-sm text-neutral-600">
            By typing your full name below and clicking Accept, you agree to this
            Machine Hire Agreement and the Terms of Trade. Your name, the time,
            and your IP address will be recorded.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
