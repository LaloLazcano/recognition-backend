const express = require("express");
const cors = require("cors");

const recognitionsRoutes = require("./routes/recognitions");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/recognitions", recognitionsRoutes);

app.get("/", (req, res) => {
  res.send("Backend de reconocimiento funcionando");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
