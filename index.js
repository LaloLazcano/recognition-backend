const express = require("express");
const cors = require("cors");

const recognitionsRoutes = require("./routes/recognitions");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 SEGURIDAD API KEY
app.use((req, res, next) => {
  if (req.path === "/health") return next();

  const apiKey = req.headers["x-api-key"];

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "No autorizado" });
  }

  next();
});

app.use("/recognitions", recognitionsRoutes);

app.get("/", (req, res) => {
  res.send("Backend de reconocimiento funcionando");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
``
