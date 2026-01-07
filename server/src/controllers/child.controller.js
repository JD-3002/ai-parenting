import Child from "../models/Child.js";

export const listChildren = async (req, res) => {
  try {
    const items = await Child.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch children" });
  }
};

export const createChild = async (req, res) => {
  const body = req.validated?.body || req.body;
  try {
    const child = await Child.create({ ...body, userId: req.user.userId });
    return res.status(201).json(child);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create child" });
  }
};

export const updateChild = async (req, res) => {
  const body = req.validated?.body || req.body;
  try {
    const child = await Child.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      body,
      { new: true }
    );
    if (!child) return res.status(404).json({ error: "Not found" });
    return res.json(child);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update child" });
  }
};

export const deleteChild = async (req, res) => {
  try {
    const child = await Child.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!child) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete child" });
  }
};
