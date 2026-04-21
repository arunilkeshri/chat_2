const express = require("express");
const { findOrCreateUser, getAllUsers } = require("../controllers/userController");

const router = express.Router();

router.post("/users", findOrCreateUser);
router.get("/users", getAllUsers);

module.exports = router;
