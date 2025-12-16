import { useEffect, useState } from "react";
import { Home as HomeIcon, Users, Wallet, Wrench, Building2, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../../supabase";

/* ================= DATE HELPERS ================= */

function toYYYYMM(date) {
  return date.toISOString().slice(0, 7);
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1); // Normalized to 1st of month to avoid overflow issues
  return d;
}

function generateMonths(start, end) {
  const months = [];
  let current = new Date(start);
  current.setDate(1);
  const endDate = new Date(end);
  endDate.setDate(1);

  while (current <= endDate) {
    months.push(toYYYYMM(current));
    current = addMonths(current, 1);
  }
  return months;
}

/* ================= HOME ================= */

export default function Home() {
  const [roomCount, setRoomCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSummary() {
    setIsLoading(true);
    const roomsRes = await supabase.from("rooms").select("*");
    const tenantsRes = await supabase.from("tenants").select("*").eq("is_active", true);
    const paymentsRes = await supabase.from("rent_payments").select("*");

    const rooms = roomsRes.data || [];
    const tenants = tenantsRes.data || [];
    const payments = paymentsRes.data || [];

    setRoomCount(rooms.length);
    setTenantCount(tenants.length);

    // ---- CALCULATE TOTAL DUE ----
    let dueSum = 0;
    const endMonth = new Date(); // current month

    tenants.forEach(tenant => {
      const room = rooms.find(r => r.room_number === tenant.room_number);
      if (!room) return;

      const perPersonRent = Math.floor(room.monthly_rent / room.capacity);
      const joinDate = new Date(tenant.join_date);
      // Logic: First payment due next month after joining
      const firstDue = addMonths(joinDate, 0); 

      if (firstDue > endMonth) return;

      const dueMonths = generateMonths(firstDue, endMonth);

      dueMonths.forEach(month => {
        const paid = payments.find(p => p.tenant_id === tenant.id && p.month === month);
        if (!paid) {
          dueSum += perPersonRent;
        }
      });
    });

    setTotalDue(dueSum);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm flex-none z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">PG Manager</h1>
            <p className="text-xs text-slate-400 font-medium mt-1 tracking-wide uppercase">Dashboard Overview</p>
          </div>
        </div>
        
        {/* Simple Status Indicator */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold">System Live</span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="w-full max-w-6xl space-y-8 my-auto">

          {/* SECTION 1: LIVE STATS */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
              title="Total Properties"
              value={roomCount}
              subtitle="Managed Rooms"
              icon={<HomeIcon className="w-6 h-6 text-indigo-600" />}
              trend="Stable"
              loading={isLoading}
            />

            <SummaryCard
              title="Active Tenants"
              value={tenantCount}
              subtitle="Current Occupancy"
              icon={<Users className="w-6 h-6 text-emerald-600" />}
              trend="+2 this month"
              loading={isLoading}
            />

            <SummaryCard
              title="Outstanding Dues"
              value={`₹${totalDue.toLocaleString()}`}
              subtitle="Pending Collection"
              icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
              isWarning={totalDue > 0}
              loading={isLoading}
            />
          </section>

          {/* SECTION 2: QUICK ACTIONS */}
          <section>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1">Management Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <NavCard
                title="Rooms"
                desc="Manage inventory"
                link="/rooms"
                icon={<HomeIcon className="w-6 h-6" />}
                color="indigo"
              />

              <NavCard
                title="Tenants"
                desc="Leases & Profiles"
                link="/tenants"
                icon={<Users className="w-6 h-6" />}
                color="emerald"
              />

              <NavCard
                title="Rent"
                desc="Payments & Dues"
                link="/rent"
                icon={<Wallet className="w-6 h-6" />}
                color="violet"
              />

              <NavCard
                title="Maintenance"
                desc="Service Requests"
                link="/maintenance"
                icon={<Wrench className="w-6 h-6" />}
                color="orange"
              />
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-slate-400 text-xs font-medium border-t border-slate-200 bg-white flex-none">
        &copy; {new Date().getFullYear()} PG Manager Pro. All rights reserved.
      </footer>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function SummaryCard({ title, value, subtitle, icon, isWarning, loading }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
      <div className={`p-3.5 rounded-xl ${isWarning ? 'bg-orange-50' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-1"></div>
        ) : (
          <h2 className={`text-3xl font-bold mt-1 ${isWarning ? 'text-orange-600' : 'text-slate-900'}`}>
            {value}
          </h2>
        )}
        <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function NavCard({ title, desc, link, icon, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  };

  return (
    <a
      href={link}
      className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-transparent hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl transition-colors duration-300 ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{title}</h2>
        <p className="text-sm text-slate-400 font-medium mt-1 group-hover:text-slate-500 transition-colors">{desc}</p>
      </div>
    </a>
  );
}