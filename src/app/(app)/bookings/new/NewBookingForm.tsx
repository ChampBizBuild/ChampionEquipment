"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, Field, inputClass } from "@/components/ui";
import { HireAgreementDocument } from "@/components/HireAgreementDocument";
import {
  EMPTY_HIRE_DETAILS,
  hireDetailsFromFormData,
} from "@/lib/hireAgreement";

type ClientOption = {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
};

type EquipmentOption = {
  id: string;
  name: string;
  status: string;
  day_rate: number;
  week_rate: number;
};

export function NewBookingForm({
  clients,
  equipment,
  business,
}: {
  clients: ClientOption[];
  equipment: EquipmentOption[];
  business: {
    business_name: string;
    abn: string;
    phone: string;
    email: string;
    address: string;
  };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(
    clients.length ? "existing" : "new",
  );
  const [clientId, setClientId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [newClient, setNewClient] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    abn: "",
    billing_address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedEquipment = equipment.find((e) => e.id === equipmentId);

  const agreementValues = useMemo(
    () => ({
      businessName: business.business_name || "Champion Equipment",
      businessAbn: business.abn || "",
      businessPhone: business.phone || "1800 673 922",
      businessEmail: business.email || "admin@championequipment.com.au",
      businessAddress: business.address || "",
      clientBusiness:
        mode === "existing"
          ? selectedClient?.business_name || ""
          : newClient.business_name,
      clientContact:
        mode === "existing"
          ? selectedClient?.contact_name || ""
          : newClient.contact_name,
      clientPhone:
        mode === "existing"
          ? selectedClient?.phone || ""
          : newClient.phone,
      clientEmail:
        mode === "existing" ? selectedClient?.email || "" : newClient.email,
      equipmentName: selectedEquipment?.name || "",
      dayRate: Number(selectedEquipment?.day_rate || 0),
      pickupDate: pickupDate || "",
      dropoffDate: dropoffDate || "",
      details: EMPTY_HIRE_DETAILS,
    }),
    [
      business,
      mode,
      selectedClient,
      selectedEquipment,
      newClient,
      pickupDate,
      dropoffDate,
    ],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const hire_details = hireDetailsFromFormData(fd);

    const payload: Record<string, unknown> = {
      equipment_id: equipmentId,
      pickup_date: pickupDate,
      dropoff_date: dropoffDate,
      notes: String(fd.get("notes") || "") || null,
      hire_details,
      send_terms: fd.get("send_terms") === "on",
    };

    if (mode === "existing") {
      payload.client_id = clientId;
    } else {
      payload.new_client = newClient;
    }

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create booking");
      return;
    }

    router.push(`/bookings/${data.booking.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex gap-2">
        <button
          type="button"
          className={mode === "existing" ? btnPrimary : btnSecondary}
          onClick={() => setMode("existing")}
          disabled={!clients.length}
        >
          Existing client
        </button>
        <button
          type="button"
          className={mode === "new" ? btnPrimary : btnSecondary}
          onClick={() => setMode("new")}
        >
          New client
        </button>
      </div>

      {mode === "existing" ? (
        <Field label="Client">
          <select
            name="client_id"
            required
            className={inputClass}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name} — {c.contact_name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Business name">
            <input
              required
              className={inputClass}
              value={newClient.business_name}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, business_name: e.target.value }))
              }
            />
          </Field>
          <Field label="Contact name">
            <input
              required
              className={inputClass}
              value={newClient.contact_name}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, contact_name: e.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              className={inputClass}
              value={newClient.email}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, email: e.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={newClient.phone}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, phone: e.target.value }))
              }
            />
          </Field>
          <Field label="ABN">
            <input
              className={inputClass}
              value={newClient.abn}
              onChange={(e) =>
                setNewClient((s) => ({ ...s, abn: e.target.value }))
              }
            />
          </Field>
          <Field label="Billing address">
            <input
              className={inputClass}
              value={newClient.billing_address}
              onChange={(e) =>
                setNewClient((s) => ({
                  ...s,
                  billing_address: e.target.value,
                }))
              }
            />
          </Field>
        </div>
      )}

      <Field label="Equipment">
        <select
          required
          className={inputClass}
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.target.value)}
        >
          <option value="">Select equipment…</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.name} ({eq.status}) — ${Number(eq.day_rate)}/day
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pickup / start date">
          <input
            type="date"
            required
            className={inputClass}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />
        </Field>
        <Field label="Drop-off / end date">
          <input
            type="date"
            required
            className={inputClass}
            value={dropoffDate}
            onChange={(e) => setDropoffDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="rounded border border-brand-yellow bg-brand-yellow/10 p-3 text-sm text-brand-black">
        Fill in the Machine Hire Agreement below. Client and machine details
        auto-fill from the selections above.
      </div>

      <HireAgreementDocument values={agreementValues} mode="edit" />

      <Field label="Internal notes (not on agreement)">
        <textarea name="notes" rows={2} className={inputClass} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input name="send_terms" type="checkbox" defaultChecked />
        Email accept link to the client now
      </label>

      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Creating…" : "Create booking"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}
