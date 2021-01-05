const express = require('express');
const path = require("path");

const hawking = express();
const port = process.env.PORT || "8000";

hawking.use(express.static(path.join(__dirname, "public")));

hawking.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
})

hawking.get("/event", (req, res) => {
  res.sendFile(__dirname + "/public/event.html");
})

module.exports = hawking;