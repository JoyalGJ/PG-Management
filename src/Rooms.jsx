import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Plus, Home, Users, DollarSign, LayoutGrid, Hash, Pencil, Trash2, X, Save } from "lucide-react";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    room_number: "",
    monthly_rent: "",
    capacity: ""
  });

  async function loadRooms() {
    setIsLoading(true);
    const { data } = await supabase.from("rooms").select("*").order("room_number");
    setRooms(data || []);
    setIsLoading(false);
  }

  async function addOrUpdateRoom() {
    if (!form.room_number || !form.monthly_rent || !form.capacity) return;

    const payload = {
      room_number: form.room_number,
      monthly_rent: Number(form.monthly_rent),
      capacity: Number(form.capacity)
    };

    if (editingId) {
      await supabase.from("rooms").update(payload).eq("id", editingId);
    } else {
      await supabase.from("rooms").insert({ ...payload, occupied: 0 });
    }

    resetForm();
    loadRooms();
  }

  function editRoom(room) {
    setEditingId(room.id);
    setForm({
      room_number: room.room_number,
      monthly_rent: room.monthly_rent,
      capacity: room.capacity
    });
  }

  async function deleteRoom(room) {
    if (room.occupied > 0) {
      alert("Cannot delete room with active tenants.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete Room ${room.room_number}?`)) {
        await supabase.from("rooms").delete().eq("id", room.id);
        loadRooms();
    }
  }

  function resetForm() {
    setForm({ room_number: "", monthly_rent: "", capacity: "" });
    setEditingId(null);
  }

  useEffect(() => { loadRooms(); }, []);

  // Stats Calculations
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
  const totalOccupied = rooms.reduce((acc, r) => acc + r.occupied, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          Room Management
        </h1>
        <p className="text-slate-500 mt-2 ml-14">Overview of current occupancy and pricing.</p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<Home className="w-5 h-5 text-indigo-600" />} label="Total Properties" value={totalRooms} />
        <StatCard icon={<Users className="w-5 h-5 text-emerald-600" />} label="Total Capacity" value={totalCapacity} />
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Occupancy Rate" value={`${totalOccupied} / ${totalCapacity}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-1">
          <div className={`bg-white rounded-2xl shadow-sm border p-6 sticky top-6 transition-colors ${editingId ? 'border-indigo-200 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
            <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              {editingId ? <Pencil className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
              {editingId ? "Edit Room Details" : "Add New Room"}
            </h2>
            
            <div className="space-y-4">
              <InputGroup 
                label="Room Number" icon={<Hash className="w-4 h-4" />} 
                placeholder="e.g. 101" value={form.room_number}
                // Only disable room number editing if that's your specific business rule, otherwise remove "disabled"
                disabled={editingId !== null} 
                onChange={e => setForm({ ...form, room_number: e.target.value })}
              />
              <InputGroup 
                label="Monthly Rent (Total)" icon={<DollarSign className="w-4 h-4" />} type="number"
                placeholder="e.g. 6000" value={form.monthly_rent}
                onChange={e => setForm({ ...form, monthly_rent: e.target.value })}
              />
              <InputGroup 
                label="Max Capacity" icon={<Users className="w-4 h-4" />} type="number"
                placeholder="e.g. 3" value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
              />

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 mt-2">
                <button 
                  onClick={addOrUpdateRoom} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex justify-center items-center gap-2"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? "Update" : "Add Room"}
                </button>
                
                {editingId && (
                  <button 
                    onClick={resetForm} 
                    className="flex-none px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition-all active:scale-95 flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="font-bold text-slate-800">Room Directory</h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{rooms.length} Rooms</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Room Detail</th>
                    <th className="p-4 font-semibold">Pricing Structure</th>
                    <th className="p-4 font-semibold">Occupancy</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.length === 0 && !isLoading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No rooms found.</td></tr>
                  ) : (
                    rooms.map((r) => {
                      const isFull = r.occupied >= r.capacity;
                      const perPerson = r.capacity > 0 ? Math.floor(r.monthly_rent / r.capacity) : 0;
                      const hasTenants = r.occupied > 0;

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors group ${editingId === r.id ? "bg-indigo-50/50" : ""}`}>
                          {/* Room Number */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                {r.room_number}
                              </div>
                            </div>
                          </td>

                          {/* Pricing */}
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">₹{r.monthly_rent.toLocaleString()}</span>
                              <span className="text-xs text-slate-400 font-medium">₹{perPerson.toLocaleString()} / person</span>
                            </div>
                          </td>

                          {/* Occupancy */}
                          <td className="p-4">
                            <div className="w-full max-w-[120px]">
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-medium text-slate-700">{r.occupied} Occupied</span>
                                <span className="text-slate-400">/ {r.capacity}</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${(r.occupied / r.capacity) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isFull ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}>
                              {isFull ? "Full" : "Available"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => editRoom(r)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Room"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              
                              <button 
                                onClick={() => deleteRoom(r)}
                                disabled={hasTenants}
                                className={`p-2 rounded-lg transition-colors ${
                                  hasTenants 
                                    ? "text-slate-200 cursor-not-allowed" 
                                    : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                }`}
                                title={hasTenants ? "Cannot delete occupied room" : "Delete Room"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

// --- Helper Components ---

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

function InputGroup({ label, icon, disabled, ...props }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative group">
        <div className={`absolute left-3 top-2.5 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-indigo-500'}`}>
          {icon}
        </div>
        <input 
          disabled={disabled}
          className={`w-full pl-10 pr-4 py-2 border rounded-lg transition-all outline-none font-medium ${
            disabled 
              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
              : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 placeholder:text-slate-400"
          }`}
          {...props}
        />
      </div>
    </div>
  );
}