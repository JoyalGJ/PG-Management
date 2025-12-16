import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [roomNo, setRoomNo] = useState("");
  const [rent, setRent] = useState("");

  async function loadRooms() {
    const { data } = await supabase.from("rooms").select("*");
    setRooms(data || []);
  }

  async function addRoom() {
    if (!roomNo || !rent) return;

    await supabase.from("rooms").insert({
      room_number: roomNo,
      monthly_rent: rent,
      capacity: 2
    });

    setRoomNo("");
    setRent("");
    loadRooms();
  }

  useEffect(() => {
    loadRooms();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-semibold mb-3">Rooms</h2>

      <input
        className="border p-1 w-full mb-2"
        placeholder="Room Number"
        value={roomNo}
        onChange={(e) => setRoomNo(e.target.value)}
      />

      <input
        className="border p-1 w-full mb-2"
        placeholder="Monthly Rent"
        value={rent}
        onChange={(e) => setRent(e.target.value)}
      />

      <button
        onClick={addRoom}
        className="bg-blue-500 text-white px-3 py-1 rounded w-full"
      >
        Add Room
      </button>

      <div className="mt-3 text-sm">
        {rooms.map((r) => (
          <div key={r.id}>
            Room {r.room_number} — ₹{r.monthly_rent}
          </div>
        ))}
      </div>
    </div>
  );
}
