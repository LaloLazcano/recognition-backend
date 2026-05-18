const express = require("express");
const router = express.Router();

// Almacenamiento en memoria (temporal)
const recognitions = [];
const userStats = {};

function daysBetween(date1, date2) {
  const diff = Math.abs(date2 - date1);
  return diff / (1000 * 60 * 60 * 24);
}

router.post("/", (req, res) => {
  const { recognizedUser, recognizedBy, reason } = req.body;

  if (!recognizedUser || !recognizedBy || !reason) {
    return res.status(400).send({ error: "Faltan datos" });
  }

  const lastByUser = recognitions
    .filter(r => r.recognizedBy === recognizedBy)
    .slice(-1)[0];

  if (lastByUser && lastByUser.recognizedUser === recognizedUser) {
    return res.status(400).send({
      error: "No puedes reconocer a la misma persona dos veces seguidas"
    });
  }

  const lastRecognitionOfUser = recognitions
    .filter(r => r.recognizedUser === recognizedUser)
    .slice(-1)[0];

  if (lastRecognitionOfUser) {
    const days = daysBetween(
      new Date(lastRecognitionOfUser.createdAt),
      new Date()
    );

    if (days < 14) {
      return res.status(400).send({
        error: "Debes esperar al menos 14 días"
      });
    }
  }

  const newRecognition = {
    recognizedUser,
    recognizedBy,
    reason,
    points: 10,
    createdAt: new Date()
  };

  recognitions.push(newRecognition);

  if (!userStats[recognizedUser]) {
    userStats[recognizedUser] = 0;
  }
  userStats[recognizedUser] += 10;

  res.status(201).send({
    message: "Reconocimiento creado",
    recognition: newRecognition,
    totalPoints: userStats[recognizedUser]
  });
});

router.get("/", (req, res) => {
  res.send(recognitions);
});

router.get("/leaderboard", (req, res) => {
  const leaderboard = Object.entries(userStats)
    .map(([user, points]) => ({ user, points }))
    .sort((a, b) => b.points - a.points);

  res.send(leaderboard);
});

module.exports = router;