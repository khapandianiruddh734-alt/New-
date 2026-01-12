export default function handler(req, res) {
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({
    date: dailyUsage.date,
    used: dailyUsage.count,
    limit: 80,
    remaining: 80 - dailyUsage.count,
    warningAt: 60,
  });
}
