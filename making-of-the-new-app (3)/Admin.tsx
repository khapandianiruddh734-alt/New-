import { useEffect, useState } from "react";

export default function Admin() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/usage", {
      headers: {
        "x-admin-secret": "super-secret-123", // same as Vercel env
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Access denied"));
  }, []);

  if (error) {
    return <h2 style={{ padding: 20 }}>{error}</h2>;
  }

  if (!data) {
    return <h2 style={{ padding: 20 }}>Loading admin data...</h2>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1>Admin Dashboard</h1>

      <p><b>Date:</b> {data.date}</p>
      <p><b>Used Requests:</b> {data.used}</p>
      <p><b>Remaining:</b> {data.remaining}</p>
      <p><b>Daily Limit:</b> {data.limit}</p>

      {data.used >= data.warningAt && (
        <p style={{ color: "orange" }}>
          ⚠️ Gemini quota is almost exhausted
        </p>
      )}

      {data.used >= data.limit && (
        <p style={{ color: "red" }}>
          ❌ Gemini quota exhausted (fallback active)
        </p>
      )}
    </div>
  );
}
