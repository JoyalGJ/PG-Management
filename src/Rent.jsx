import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  Calendar, Home, User, DollarSign,
  CheckCircle, AlertCircle, X, Search
} from "lucide-react";

/* ================= DATE UTILS ================= */

function toMonthString(date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  return d;
}

function monthsBetween(start, end) {
  const months = [];
  const current = new Date(start);
  current.setDate(1);

  const endDate = new Date(end);
  endDate.setDate(1);

  while (current <= endDate) {
    months.push(toMonthString(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/* ================= COMPONENT ================= */

export default function Rent() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState({
    tenantId: "",
    room: "",
    month: "" // optional, not mandatory
  });

  /* ================= LOAD ================= */

  async function load() {
    setIsLoading(true);

    // 🔑 IMPORTANT: load ALL tenants (active + past)
    const t = await supabase.from("tenants").select("*");
    const r = await supabase.from("rooms").select("*");
    const p = await supabase.from("rent_payments").select("*");

    setTenants(t.data || []);
    setRooms(r.data || []);
    setPayments(p.data || []);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  /* ================= HELPERS ================= */

  function perPersonRent(roomNo) {
    const room = rooms.find(r => r.room_number === roomNo);
    return room ? Math.floor(room.monthly_rent / room.capacity) : 0;
  }

  function paymentFor(tenantId, month) {
    return payments.find(
      p => p.tenant_id === tenantId && p.month === month
    );
  }

  function dueMonths(tenant) {
    if (!tenant.join_date) return [];

    const joinDate = new Date(tenant.join_date);

    // 🔑 First due = NEXT month after join
    const firstDue = addMonths(joinDate, 1);

    const endMonth = filters.month
      ? new Date(filters.month + "-01")
      : new Date();

    if (firstDue > endMonth) return [];

    return monthsBetween(firstDue, endMonth);
  }

  /* ================= BUILD LEDGER ================= */

  const rows = [];

  tenants.forEach(tenant => {
    if (filters.tenantId && tenant.id !== filters.tenantId) return;
    if (filters.room && tenant.room_number !== filters.room) return;

    const months = dueMonths(tenant);

    months.forEach(month => {
      if (filters.month && month !== filters.month) return;

      const payment = paymentFor(tenant.id, month);
      const amount = perPersonRent(tenant.room_number);

      const [y, m] = month.split("-");
      const dueDate = new Date(y, m - 1, 5); // fixed due date (5th of month)

      const today = new Date();
      const isOverdue = !payment && today > dueDate;

      const daysOverdue = isOverdue
        ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      rows.push({
        tenant,
        month,
        payment,
        amount,
        dueDate,
        daysOverdue
      });
    });
  });

  /* ================= ACTION ================= */

  async function markPaid(row) {
    if (!window.confirm(
      `Confirm ₹${row.amount} payment for ${row.tenant.name} (${row.month})`
    )) return;

    await supabase.from("rent_payments").insert({
      tenant_id: row.tenant.id,
      room_number: row.tenant.room_number,
      month: row.month,
      amount: row.amount,
      paid_date: new Date()
    });

    load();
  }

  const clearFilters = () =>
    setFilters({ tenantId: "", room: "", month: "" });

  const hasFilters = filters.tenantId || filters.room || filters.month;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50 p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        Rent Ledger
      </h1>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl border mb-6 flex gap-4 flex-wrap">
        <select
          className="border p-2 rounded"
          value={filters.tenantId}
          onChange={e => setFilters({ ...filters, tenantId: e.target.value })}
        >
          <option value="">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} {!t.is_active && "(Past)"}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={filters.room}
          onChange={e => setFilters({ ...filters, room: e.target.value })}
        >
          <option value="">All Rooms</option>
          {rooms.map(r => (
            <option key={r.id} value={r.room_number}>
              Room {r.room_number}
            </option>
          ))}
        </select>

        <input
          type="month"
          className="border p-2 rounded"
          value={filters.month}
          onChange={e => setFilters({ ...filters, month: e.target.value })}
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-slate-500"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 text-sm">
            <tr>
              <th className="p-3 text-left">Tenant</th>
              <th className="p-3">Month</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Due</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <Search className="mx-auto mb-2" /> No records found
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t ${
                    !row.payment && row.daysOverdue > 0
                      ? "bg-red-50"
                      : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="font-semibold">{row.tenant.name}</div>
                    <div className="text-xs text-slate-400">
                      Room {row.tenant.room_number}
                      {!row.tenant.is_active && " • Past"}
                    </div>
                  </td>

                  <td className="p-3">{row.month}</td>
                  <td className="p-3 font-bold">₹{row.amount}</td>

                  <td className="p-3">
                    {row.dueDate.toLocaleDateString()}
                    {!row.payment && row.daysOverdue > 0 && (
                      <div className="text-xs text-red-600">
                        {row.daysOverdue} days overdue
                      </div>
                    )}
                  </td>

                  <td className="p-3">
                    {row.payment ? (
                      <div className="text-emerald-600 text-sm font-bold">
                        <CheckCircle className="inline w-4 h-4" /> Paid
                        <div className="text-xs text-slate-400">
                          on {new Date(row.payment.paid_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-orange-600 font-bold text-sm">
                        <AlertCircle className="inline w-4 h-4" /> Pending
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    {!row.payment && (
                      <button
                        onClick={() => markPaid(row)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
