import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Maintenance() {
  const [room, setRoom] = useState("");
  const [issue, setIssue] = useState("");
  const [list, setList] = useState([]);

  async function load() {
    const { data } = await supabase
      .from("maintenance_requests")
      .select("*")
      .order("created_at", { ascending: false });

    setList(data || []);
  }

  async function submit() {
    if (!room || !issue) return;

    await supabase.from("maintenance_requests").insert({
      room_number: room,
      issue,
      status: "Open"
    });

    setRoom("");
    setIssue("");
    load();
  }

  async function resolve(id) {
    await supabase
      .from("maintenance_requests")
      .update({ status: "Resolved" })
      .eq("id", id);

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-3">Maintenance</h2>

      <input
        className="border p-1 w-full mb-2"
        placeholder="Room Number"
        value={room}
        onChange={e => setRoom(e.target.value)}
      />

      <input
        className="border p-1 w-full mb-2"
        placeholder="Issue description"
        value={issue}
        onChange={e => setIssue(e.target.value)}
      />

      <button
        onClick={submit}
        className="bg-purple-500 text-white px-3 py-1 rounded w-full mb-4"
      >
        Submit Request
      </button>

      <h3 className="font-semibold mb-2">Requests</h3>
      {list.map(m => (
        <div key={m.id} className="flex justify-between text-sm mb-1">
          <span>
            Room {m.room_number}: {m.issue} ({m.status})
          </span>
          {m.status === "Open" && (
            <button
              onClick={() => resolve(m.id)}
              className="text-green-600"
            >
              Resolve
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
