import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Rent() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  async function load() {
    const t = await supabase.from("tenants").select("*");
    const p = await supabase
      .from("rent_payments")
      .select("*")
      .eq("month", month);

    setTenants(t.data || []);
    setPayments(p.data || []);
  }

  async function markPaid(tenant) {
    await supabase.from("rent_payments").insert({
      tenant_id: tenant.id,
      room_number: tenant.room_number,
      month,
      amount: 0,
      paid_date: new Date()
    });

    load();
  }

  useEffect(() => {
    load();
  }, [month]);

  const paidTenantIds = payments.map(p => p.tenant_id);
  const paid = tenants.filter(t => paidTenantIds.includes(t.id));
  const due = tenants.filter(t => !paidTenantIds.includes(t.id));

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-3">Rent Management</h2>

      <input
        type="month"
        className="border p-1 mb-4 w-full"
        value={month}
        onChange={e => setMonth(e.target.value)}
      />

      <h3 className="font-semibold text-red-600 mb-2">
        Due ({due.length})
      </h3>
      {due.map(t => (
        <div key={t.id} className="flex justify-between text-sm mb-1">
          <span>{t.name} — Room {t.room_number}</span>
          <button
            onClick={() => markPaid(t)}
            className="bg-red-500 text-white px-2 rounded"
          >
            Mark Paid
          </button>
        </div>
      ))}

      <h3 className="font-semibold text-green-600 mt-4 mb-2">
        Paid ({paid.length})
      </h3>
      {paid.map(t => (
        <div key={t.id} className="text-sm">
          {t.name} — Room {t.room_number}
        </div>
      ))}
    </div>
  );
}
