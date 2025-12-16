import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { 
  Users, UserPlus, Home, Phone, Calendar, 
  Banknote, Pencil, UserX, X, User, RotateCcw, Check, LayoutGrid, Search
} from "lucide-react";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    contact: "",
    room_number: "",
    deposit_amount: "",
    join_date: ""
  });

  /* ================= LOAD DATA ================= */

  async function loadData() {
    setIsLoading(true);
    const t = await supabase.from("tenants").select("*").order("name");
    const r = await supabase.from("rooms").select("*");
    setTenants(t.data || []);
    setRooms(r.data || []);
    setIsLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* ================= DERIVED ================= */

  const activeTenants = tenants.filter(t => t.is_active);
  const pastTenants = tenants.filter(t => !t.is_active);

  const availableRooms = rooms.filter(
    r => r.occupied < r.capacity || (editingId && r.room_number === tenants.find(t => t.id === editingId)?.room_number)
  );

  /* ================= HELPERS ================= */

  function oldTenantRoom(tenant) {
    return rooms.find(r => r.room_number === tenant.room_number)?.occupied || 0;
  }

  function newRoom(roomNo) {
    return rooms.find(r => r.room_number === roomNo)?.occupied || 0;
  }

  /* ================= FORM ACTIONS ================= */

  async function addOrUpdateTenant() {
    if (!form.name || !form.room_number) return;
    const joinDate = form.join_date || new Date().toISOString().split("T")[0];

    // EDIT
    if (editingId && !isReactivating && !isViewMode) {
      const oldTenant = tenants.find(t => t.id === editingId);
      if (oldTenant.room_number !== form.room_number) {
        await supabase.from("rooms").update({ occupied: oldTenantRoom(oldTenant) - 1 }).eq("room_number", oldTenant.room_number);
        await supabase.from("rooms").update({ occupied: newRoom(form.room_number) + 1 }).eq("room_number", form.room_number);
      }
      await supabase.from("tenants").update({ name: form.name, contact: form.contact, room_number: form.room_number, deposit_amount: form.deposit_amount, join_date: joinDate }).eq("id", editingId);
    }
    // REACTIVATE
    else if (editingId && isReactivating) {
      if (!form.room_number || !form.deposit_amount) { alert("Room and deposit required"); return; }
      await supabase.from("tenants").update({ room_number: form.room_number, deposit_amount: form.deposit_amount, join_date: joinDate, is_active: true }).eq("id", editingId);
      await supabase.from("rooms").update({ occupied: newRoom(form.room_number) + 1 }).eq("room_number", form.room_number);
    }
    // ADD
    else {
      await supabase.from("tenants").insert({ name: form.name, contact: form.contact, room_number: form.room_number, deposit_amount: form.deposit_amount, join_date: joinDate, is_active: true });
      await supabase.from("rooms").update({ occupied: newRoom(form.room_number) + 1 }).eq("room_number", form.room_number);
    }
    resetForm();
    loadData();
  }

  async function removeTenant(tenant) {
    if (!window.confirm(`Remove ${tenant.name}?`)) return;
    await supabase.from("tenants").update({ is_active: false }).eq("id", tenant.id);
    await supabase.from("rooms").update({ occupied: oldTenantRoom(tenant) - 1 }).eq("room_number", tenant.room_number);
    loadData();
  }

  /* ================= VIEW / EDIT / REACTIVATE ================= */

  function viewTenant(t) {
    setEditingId(t.id); setIsViewMode(true); setIsReactivating(false);
    setForm({ name: t.name, contact: t.contact, room_number: t.room_number, deposit_amount: t.deposit_amount, join_date: t.join_date });
  }

  function editTenant(t) {
    setEditingId(t.id); setIsViewMode(false); setIsReactivating(false);
    setForm({ name: t.name, contact: t.contact, room_number: t.room_number, deposit_amount: t.deposit_amount, join_date: t.join_date });
  }

  function reactivateTenant(t) {
    setEditingId(t.id); setIsViewMode(false); setIsReactivating(true);
    setForm({ name: t.name, contact: t.contact, room_number: "", deposit_amount: "", join_date: new Date().toISOString().split("T")[0] });
  }

  function resetForm() {
    setEditingId(null); setIsViewMode(false); setIsReactivating(false);
    setForm({ name: "", contact: "", room_number: "", deposit_amount: "", join_date: "" });
  }

  // --- STATS ---
  const totalDeposit = activeTenants.reduce((sum, t) => sum + (Number(t.deposit_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          Tenant Directory
        </h1>
        <p className="text-slate-500 mt-2 ml-14">Manage active leases, history, and reactivation.</p>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-5xl">
        <StatCard icon={<Users className="w-5 h-5 text-indigo-600" />} label="Active Tenants" value={activeTenants.length} />
        <StatCard icon={<Banknote className="w-5 h-5 text-emerald-600" />} label="Deposits Held" value={`₹${totalDeposit.toLocaleString()}`} />
        <StatCard icon={<RotateCcw className="w-5 h-5 text-slate-500" />} label="Past Records" value={pastTenants.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-1">
          <div className={`bg-white rounded-2xl shadow-sm border p-6 sticky top-6 transition-all ${editingId ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-indigo-600" />}
              {editingId 
                ? isViewMode ? "Tenant Details" : isReactivating ? "Reactivate Tenant" : "Edit Tenant"
                : "Register New Tenant"
              }
            </h2>

            <div className="space-y-4">
              <InputGroup 
                icon={<User className="w-4 h-4" />} placeholder="Full Name" 
                value={form.name} disabled={isViewMode}
                onChange={e => setForm({ ...form, name: e.target.value })} 
              />
              
              <InputGroup 
                icon={<Phone className="w-4 h-4" />} placeholder="Phone Number" 
                value={form.contact} disabled={isViewMode}
                onChange={e => setForm({ ...form, contact: e.target.value })} 
              />

              <div className="relative group">
                <div className={`absolute left-3 top-2.5 transition-colors ${isViewMode ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
                  <Home className="w-4 h-4" />
                </div>
                <select
                  disabled={isViewMode}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none font-medium appearance-none transition-all ${
                    isViewMode 
                      ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                      : "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  value={form.room_number}
                  onChange={e => setForm({ ...form, room_number: e.target.value })}
                >
                  <option value="">Select Room</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.room_number}>Room {r.room_number} ({r.occupied}/{r.capacity})</option>
                  ))}
                </select>
              </div>

              <InputGroup 
                icon={<Banknote className="w-4 h-4" />} placeholder="Deposit Amount" type="number"
                value={form.deposit_amount} disabled={isViewMode}
                onChange={e => setForm({ ...form, deposit_amount: e.target.value })} 
              />

              <InputGroup 
                icon={<Calendar className="w-4 h-4" />} type="date"
                value={form.join_date} disabled={isViewMode}
                onChange={e => setForm({ ...form, join_date: e.target.value })} 
              />

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-4 pt-2 border-t border-slate-100">
                {!isViewMode && (
                  <button 
                    onClick={addOrUpdateTenant} 
                    className={`flex-1 font-semibold py-2.5 rounded-lg transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2 text-white ${
                      isReactivating ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? "Save Changes" : "Register Tenant"}
                  </button>
                )}

                {isViewMode && (
                  <div className="flex gap-2 w-full">
                     {tenants.find(t => t.id === editingId)?.is_active ? (
                        <button onClick={() => setIsViewMode(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition-all shadow-md">
                          Edit
                        </button>
                     ) : (
                        <button onClick={() => reactivateTenant(tenants.find(t => t.id === editingId))} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-all shadow-md">
                          Reactivate
                        </button>
                     )}
                  </div>
                )}

                {(editingId || isViewMode) && (
                  <button onClick={resetForm} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors" title="Cancel">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LISTS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ACTIVE TENANTS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Tenants
              </h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                {activeTenants.length} Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Details</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTenants.length === 0 && !isLoading ? (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">No active tenants.</td></tr>
                  ) : (
                    activeTenants.map(t => (
                      <tr key={t.id} onClick={() => viewTenant(t)} className={`hover:bg-slate-50 transition-colors cursor-pointer group ${editingId === t.id ? 'bg-indigo-50/50' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{t.name}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3"/> {t.contact}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                             <Home className="w-3 h-3 text-slate-400" /> Room {t.room_number}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); editTenant(t); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); removeTenant(t); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAST TENANTS */}
          {pastTenants.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-slate-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Past Tenants
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                  {pastTenants.length} Archived
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {pastTenants.map(t => (
                      <tr key={t.id} onClick={() => viewTenant(t)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="p-4 text-slate-500 font-medium">{t.name}</td>
                        <td className="p-4 text-slate-400 text-sm">Room {t.room_number}</td>
                        <td className="p-4 text-right">
                          <button onClick={(e) => { e.stopPropagation(); reactivateTenant(t); }} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center justify-end gap-1">
                            <RotateCcw className="w-3 h-3" /> Reactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function InputGroup({ icon, disabled, ...props }) {
  return (
    <div className="relative group">
      <div className={`absolute left-3 top-2.5 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
        {icon}
      </div>
      <input 
        disabled={disabled}
        className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none font-medium transition-all ${
          disabled 
            ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
            : "bg-slate-50 border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
        }`}
        {...props}
      />
    </div>
  );
}