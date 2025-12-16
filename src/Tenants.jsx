import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [deposit, setDeposit] = useState("");
  const [room, setRoom] = useState("");

  async function load() {
    const t = await supabase.from("tenants").select("*");
    const r = await supabase.from("rooms").select("*");
    setTenants(t.data || []);
    setRooms(r.data || []);
  }

  async function addTenant() {
    if (!name || !room) return;

    await supabase.from("tenants").insert({
      name,
      contact,
      deposit_amount: deposit,
      room_number: room
    });

    setName(""); setContact(""); setDeposit(""); setRoom("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-3">Tenants</h2>

      <input className="border p-1 w-full mb-2"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input className="border p-1 w-full mb-2"
        placeholder="Contact"
        value={contact}
        onChange={e => setContact(e.target.value)}
      />

      <input className="border p-1 w-full mb-2"
        placeholder="Deposit"
        value={deposit}
        onChange={e => setDeposit(e.target.value)}
      />

      <select className="border p-1 w-full mb-2"
        value={room}
        onChange={e => setRoom(e.target.value)}
      >
        <option value="">Select Room</option>
        {rooms.map(r => (
          <option key={r.id} value={r.room_number}>
            Room {r.room_number}
          </option>
        ))}
      </select>

      <button
        onClick={addTenant}
        className="bg-green-500 text-white px-3 py-1 rounded w-full"
      >
        Add Tenant
      </button>

      <div className="mt-3 text-sm">
        {tenants.map(t => (
          <div key={t.id}>
            {t.name} → Room {t.room_number}
          </div>
        ))}
      </div>
    </div>
  );
}
