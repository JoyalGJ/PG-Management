import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Users, UserPlus, Home, Phone, Calendar, Banknote, Search, Pencil, UserX, Save, X, User } from "lucide-react";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    const t = await supabase.from("tenants").select("*").eq("is_active", true).order("name");
    const r = await supabase.from("rooms").select("*");

    setTenants(t.data || []);
    setRooms(r.data || []);
    setIsLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  /* =============== HELPERS ================= */

  const availableRooms = rooms.filter(
    r => r.occupied < r.capacity || 
    (editingId && r.room_number === tenants.find(t => t.id === editingId)?.room_number)
  );

  // Stats Calculations
  const totalTenants = tenants.length;
  const totalDeposits = tenants.reduce((sum, t) => sum + (Number(t.deposit_amount) || 0), 0);

  /* ================= ADD / EDIT ================= */

  async function addOrUpdateTenant() {
    if (!form.name || !form.room_number) return;

    const joinDate = form.join_date || new Date().toISOString().split("T")[0];

    if (editingId) {
      const oldTenant = tenants.find(t => t.id === editingId);

      if (oldTenant.room_number !== form.room_number) {
        // Update old room occupancy
        await supabase.from("rooms").update({ occupied: oldTenantRoom(oldTenant) - 1 }).eq("room_number", oldTenant.room_number);
        // Update new room occupancy
        await supabase.from("rooms").update({ occupied: newRoom(form.room_number) + 1 }).eq("room_number", form.room_number);
      }

      await supabase.from("tenants").update({
        name: form.name,
        contact: form.contact,
        room_number: form.room_number,
        deposit_amount: form.deposit_amount,
        join_date: joinDate
      }).eq("id", editingId);
    } else {
      await supabase.from("tenants").insert({
        name: form.name,
        contact: form.contact,
        room_number: form.room_number,
        deposit_amount: form.deposit_amount,
        join_date: joinDate,
        is_active: true
      });

      await supabase.from("rooms").update({ occupied: newRoom(form.room_number) + 1 }).eq("room_number", form.room_number);
    }

    resetForm();
    loadData();
  }

  /* =============== SOFT DELETE ================= */

  async function removeTenant(tenant) {
    if(!window.confirm(`Are you sure you want to remove ${tenant.name}?`)) return;

    await supabase.from("tenants").update({ is_active: false }).eq("id", tenant.id);
    await supabase.from("rooms").update({ occupied: oldTenantRoom(tenant) - 1 }).eq("room_number", tenant.room_number);
    loadData();
  }

  /* ================= EDIT ================= */

  function editTenant(tenant) {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name,
      contact: tenant.contact,
      room_number: tenant.room_number,
      deposit_amount: tenant.deposit_amount,
      join_date: tenant.join_date
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", contact: "", room_number: "", deposit_amount: "", join_date: "" });
  }

  /* =============== ROOM OCC HELPERS ================= */

  function oldTenantRoom(tenant) {
    return rooms.find(r => r.room_number === tenant.room_number)?.occupied || 0;
  }

  function newRoom(roomNo) {
    return rooms.find(r => r.room_number === roomNo)?.occupied || 0;
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          Tenant Directory
        </h1>
        <p className="text-slate-500 mt-2 ml-14">Manage active leases and tenant details.</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl">
        <StatCard 
          icon={<Users className="w-5 h-5 text-indigo-600" />} 
          label="Active Tenants" 
          value={totalTenants} 
        />
        <StatCard 
          icon={<Banknote className="w-5 h-5 text-emerald-600" />} 
          label="Total Deposits Held" 
          value={`₹${totalDeposits.toLocaleString()}`} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: FORM */}
        <div className="lg:col-span-1">
          <div className={`bg-white rounded-2xl shadow-sm border p-6 sticky top-6 transition-all ${editingId ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-indigo-600" />}
              {editingId ? "Edit Tenant Details" : "Register New Tenant"}
            </h2>

            <div className="space-y-4">
              <InputGroup 
                icon={<User className="w-4 h-4" />} 
                placeholder="Full Name" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
              />
              
              <InputGroup 
                icon={<Phone className="w-4 h-4" />} 
                placeholder="Phone / Contact" 
                value={form.contact} 
                onChange={e => setForm({ ...form, contact: e.target.value })} 
              />

              {/* Custom Select Box Styling */}
              <div className="relative group">
                <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Home className="w-4 h-4" />
                </div>
                <select
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 appearance-none cursor-pointer"
                  value={form.room_number}
                  onChange={e => setForm({ ...form, room_number: e.target.value })}
                >
                  <option value="">Select Room</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.room_number}>
                      Room {r.room_number} (Occupied: {r.occupied}/{r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <InputGroup 
                icon={<Banknote className="w-4 h-4" />} 
                placeholder="Deposit Amount" 
                type="number" 
                value={form.deposit_amount} 
                onChange={e => setForm({ ...form, deposit_amount: e.target.value })} 
              />

              <InputGroup 
                icon={<Calendar className="w-4 h-4" />} 
                type="date" 
                value={form.join_date} 
                onChange={e => setForm({ ...form, join_date: e.target.value })} 
              />

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={addOrUpdateTenant} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex justify-center items-center gap-2"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {editingId ? "Update" : "Add Tenant"}
                </button>
                
                {editingId && (
                  <button onClick={resetForm} className="flex-none px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition-all active:scale-95">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-bold text-slate-800">Tenant List</h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{tenants.length} Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Tenant Name</th>
                    <th className="p-4 font-semibold">Room No</th>
                    <th className="p-4 font-semibold">Deposit</th>
                    <th className="p-4 font-semibold">Joined</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenants.length === 0 && !isLoading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No active tenants found.</td></tr>
                  ) : (
                    tenants.map(t => (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors group ${editingId === t.id ? "bg-indigo-50/50" : ""}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                              {t.name.substring(0,2)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{t.name}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {t.contact}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-sm">
                            <Home className="w-3 h-3 text-slate-400" /> {t.room_number}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">
                          ₹{Number(t.deposit_amount).toLocaleString()}
                        </td>
                        <td className="p-4 text-slate-500 text-sm">
                          {t.join_date}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => editTenant(t)} 
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => removeTenant(t)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove (Soft Delete)"
                            >
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
        </div>

      </div>
    </div>
  );
}

// --- Helpers ---

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

function InputGroup({ icon, ...props }) {
  return (
    <div className="relative group">
      <div className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
        {icon}
      </div>
      <input 
        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-400"
        {...props}
      />
    </div>
  );
}