import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Wrench, CheckCircle, AlertCircle, Clock, Plus, Home, FileText, Play, Check, User, Search } from "lucide-react";

export default function Maintenance() {
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]); // 1. Store tenants
  const [requests, setRequests] = useState([]);
  const [showResolved, setShowResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    room_number: "",
    tenant_id: "", // 2. Track selected tenant
    issue: ""
  });

  /* ================= LOAD ================= */

  async function load() {
    setIsLoading(true);
    const r = await supabase.from("rooms").select("*");
    // Fetch active tenants to populate the dropdown
    const t = await supabase.from("tenants").select("*").eq("is_active", true); 
    const q = await supabase.from("maintenance_requests").select("*").order("created_at", { ascending: false });

    setRooms(r.data || []);
    setTenants(t.data || []);
    setRequests(q.data || []);
    setIsLoading(false);
  }

  useEffect(() => { load(); }, []);

  /* ================= HELPERS ================= */

  // Filter tenants based on the selected room
  const roomTenants = tenants.filter(t => t.room_number === form.room_number);

  /* ================= ACTIONS ================= */

  async function submitRequest() {
    if (!form.room_number || !form.issue) return;

    // Find tenant name to attach to the issue description
    const tenantName = tenants.find(t => t.id === form.tenant_id)?.name;
    const finalIssue = tenantName 
      ? `${form.issue} (Reported by: ${tenantName})` 
      : form.issue;

    await supabase.from("maintenance_requests").insert({
      room_number: form.room_number,
      issue: finalIssue,
      status: "Open"
    });

    setForm({ room_number: "", tenant_id: "", issue: "" });
    load();
  }

  async function updateStatus(id, status) {
    await supabase.from("maintenance_requests").update({ status }).eq("id", id);
    load();
  }

  /* ================= UI HELPERS ================= */

  const visibleRequests = showResolved
    ? requests.filter(r => r.status === "Resolved")
    : requests.filter(r => r.status !== "Resolved");

  const openCount = requests.filter(r => r.status === 'Open').length;
  const progressCount = requests.filter(r => r.status === 'In Progress').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          Maintenance Desk
        </h1>
        <p className="text-slate-500 mt-2 ml-14">Track repairs and manage property upkeep.</p>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon={<AlertCircle className="w-5 h-5 text-red-500" />} 
          label="Open Tickets" 
          value={openCount}
          color="text-red-600"
        />
        <StatCard 
          icon={<Clock className="w-5 h-5 text-orange-500" />} 
          label="In Progress" 
          value={progressCount}
          color="text-orange-600"
        />
        <StatCard 
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} 
          label="Resolved (All Time)" 
          value={resolvedCount}
          color="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: RAISE TICKET FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Raise New Ticket
            </h2>

            <div className="space-y-4">
              
              {/* 1. ROOM SELECT */}
              <div className="relative group">
                <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Home className="w-4 h-4" />
                </div>
                <select
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 appearance-none cursor-pointer"
                  value={form.room_number}
                  onChange={e => setForm({ ...form, room_number: e.target.value, tenant_id: "" })} // Reset tenant when room changes
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.room_number}>Room {r.room_number}</option>
                  ))}
                </select>
              </div>

              {/* 2. TENANT SELECT (New) */}
              <div className="relative group">
                <div className={`absolute left-3 top-2.5 transition-colors ${!form.room_number ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                  <User className="w-4 h-4" />
                </div>
                <select
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none font-medium appearance-none transition-all ${
                    !form.room_number 
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
                      : "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  value={form.tenant_id}
                  disabled={!form.room_number}
                  onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                >
                  <option value="">Select Tenant (Optional)</option>
                  {roomTenants.length > 0 ? (
                    roomTenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  ) : (
                    <option disabled>No active tenants in this room</option>
                  )}
                </select>
              </div>

              {/* 3. ISSUE DESCRIPTION */}
              <div className="relative group">
                <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <textarea
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-400 min-h-[120px] resize-none"
                  placeholder="Describe the issue (e.g., Leaking tap, Broken light)"
                  value={form.issue}
                  onChange={e => setForm({ ...form, issue: e.target.value })}
                />
              </div>

              <button 
                onClick={submitRequest}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Submit Request
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: TICKET LIST */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
            
            {/* TAB SWITCHER */}
            <div className="border-b border-slate-100 flex p-2 bg-slate-50/50">
              <button 
                onClick={() => setShowResolved(false)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${!showResolved ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <AlertCircle className="w-4 h-4" /> Active Issues
              </button>
              <button 
                onClick={() => setShowResolved(true)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${showResolved ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <CheckCircle className="w-4 h-4" /> History
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-4 w-[15%]">Room</th>
                    <th className="p-4 w-[40%]">Issue Description</th>
                    <th className="p-4 w-[20%]">Status</th>
                    <th className="p-4 w-[25%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRequests.length === 0 && !isLoading ? (
                    <tr>
                      <td colSpan="4" className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                          <CheckCircle className="w-8 h-8 text-slate-200" />
                          <p>No requests found in this section.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleRequests.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 align-top">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                            <Home className="w-3 h-3 text-slate-400" /> {r.room_number}
                          </span>
                        </td>
                        <td className="p-4 align-top">
                          <p className="text-sm font-medium text-slate-800 leading-relaxed">{r.issue}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4 align-top">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-4 align-top text-right">
                          <div className="flex justify-end gap-2">
                            {r.status === "Open" && (
                              <button 
                                onClick={() => updateStatus(r.id, "In Progress")}
                                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Play className="w-3 h-3 fill-current" /> Start
                              </button>
                            )}
                            {r.status !== "Resolved" && (
                              <button 
                                onClick={() => updateStatus(r.id, "Resolved")}
                                className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Check className="w-3 h-3" /> Resolve
                              </button>
                            )}
                            {r.status === "Resolved" && (
                                <span className="text-xs text-slate-400 italic">Completed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- UI COMPONENTS ---

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold ${color || 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    "Open": "bg-red-50 text-red-600 border-red-100",
    "In Progress": "bg-orange-50 text-orange-600 border-orange-100",
    "Resolved": "bg-emerald-50 text-emerald-600 border-emerald-100"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}