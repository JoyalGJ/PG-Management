import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Filter, Calendar, Home, User, DollarSign, CheckCircle, AlertCircle, X, Search } from "lucide-react";

/* ================= UTILITIES ================= */

function toMonthString(date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function monthsBetween(start, end) {
  const result = [];
  const current = new Date(start);
  // Reset days to 1 to avoid month skipping issues
  current.setDate(1); 
  const endDate = new Date(end);
  endDate.setDate(1);

  while (current <= endDate) {
    result.push(toMonthString(current));
    current.setMonth(current.getMonth() + 1);
  }
  return result;
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
    month: toMonthString(new Date())
  });

  /* ================= LOAD ================= */

  async function load() {
    setIsLoading(true);
    const t = await supabase.from("tenants").select("*").eq("is_active", true);
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
    return payments.find(p => p.tenant_id === tenantId && p.month === month);
  }

  function dueMonths(tenant) {
    const join = new Date(tenant.join_date);
    // Logic: First rent due next month after joining (adjust if needed)
    const firstDue = addMonths(join, 0); 
    const selectedMonthEnd = new Date(filters.month + "-01");
    // Only generate rows up to selected filter month
    if (firstDue > selectedMonthEnd) return [];
    return monthsBetween(firstDue, selectedMonthEnd);
  }

  /* ================= BUILD ROWS ================= */

  const rows = [];

  tenants.forEach(tenant => {
    if (filters.tenantId && tenant.id !== filters.tenantId) return;
    if (filters.room && tenant.room_number !== filters.room) return;

    const months = dueMonths(tenant);

    months.forEach(month => {
      // Apply Month Filter Strictly
      if (filters.month && month !== filters.month) return;

      const payment = paymentFor(tenant.id, month);
      
      // Calculate Due Date based on month
      const [y, m] = month.split('-');
      const dueDate = new Date(y, m - 1, new Date(tenant.join_date).getDate());
      
      const today = new Date();
      const isOverdue = !payment && today > dueDate;
      
      const daysOverdue = isOverdue
          ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
          : 0;

      rows.push({
        tenant,
        month,
        payment,
        dueDate,
        daysOverdue,
        amount: perPersonRent(tenant.room_number)
      });
    });
  });

  /* ================= ACTION ================= */

  async function markPaid(row) {
    if(!window.confirm(`Confirm payment of ₹${row.amount} for ${row.tenant.name}?`)) return;

    await supabase.from("rent_payments").insert({
      tenant_id: row.tenant.id,
      room_number: row.tenant.room_number,
      month: row.month,
      amount: row.amount,
      paid_date: new Date()
    });

    load();
  }

  const clearFilters = () => setFilters({ tenantId: "", room: "", month: toMonthString(new Date()) });
  const hasFilters = filters.tenantId || filters.room;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          Rent Records
        </h1>
        <p className="text-slate-500 mt-2 ml-14">Filter and track payment history across all tenants.</p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        
        <div className="flex flex-col md:flex-row gap-4 w-full">
          {/* Tenant Filter */}
          <div className="relative group flex-1">
            <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <User className="w-4 h-4" />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 cursor-pointer appearance-none"
              value={filters.tenantId}
              onChange={e => setFilters({ ...filters, tenantId: e.target.value })}
            >
              <option value="">All Tenants</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div className="relative group flex-1">
            <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Home className="w-4 h-4" />
            </div>
            <select
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 cursor-pointer appearance-none"
              value={filters.room}
              onChange={e => setFilters({ ...filters, room: e.target.value })}
            >
              <option value="">All Rooms</option>
              {rooms.map(r => (
                <option key={r.id} value={r.room_number}>Room {r.room_number}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="relative group flex-1">
            <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="month"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 cursor-pointer"
              value={filters.month}
              onChange={e => setFilters({ ...filters, month: e.target.value })}
            />
          </div>
        </div>

        {/* Clear Button */}
        {hasFilters && (
          <button 
            onClick={clearFilters}
            className="flex-none flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-4">Tenant Details</th>
                <th className="p-4">Month</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && !isLoading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 text-slate-200" />
                  No records found matching these filters.
                </td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors group ${!row.payment && row.daysOverdue > 0 ? "bg-red-50/50 hover:bg-red-50" : ""}`}>
                    
                    {/* Tenant Info */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{row.tenant.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Home className="w-3 h-3" /> Room {row.tenant.room_number}
                      </div>
                    </td>

                    {/* Month */}
                    <td className="p-4 font-medium text-slate-600">
                      {row.month}
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-bold text-slate-700">
                      ₹{row.amount.toLocaleString()}
                    </td>

                    {/* Due Date */}
                    <td className="p-4">
                      <div className="text-sm text-slate-600">{row.dueDate.toLocaleDateString()}</div>
                      {!row.payment && row.daysOverdue > 0 && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded ml-[-2px]">
                          {row.daysOverdue} days overdue
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {row.payment ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
                            <CheckCircle className="w-4 h-4" /> Paid
                          </span>
                          <span className="text-[10px] text-slate-400">
                             on {new Date(row.payment.paid_date).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                         <span className={`inline-flex items-center gap-1 text-sm font-bold ${row.daysOverdue > 0 ? "text-red-600" : "text-orange-500"}`}>
                           <AlertCircle className="w-4 h-4" /> {row.daysOverdue > 0 ? "Overdue" : "Pending"}
                         </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="p-4 text-right">
                      {!row.payment && (
                        <button 
                          onClick={() => markPaid(row)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95"
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
    </div>
  );
}