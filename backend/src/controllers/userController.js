const User = require("../models/User");

const findOrCreateUser = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    let user = await User.findOne({ name: name.trim() });
    if (!user) {
      user = await User.create({ name: name.trim() });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { findOrCreateUser, getAllUsers };
