const express = require("express");
const router = express.Router();

const recognitions = [];
const userStats = {};
const lastRecognizedAt = {};
const lastTargetByGiver = {};

const FEED_DAYS = 4;
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function cutoffDate(days) {
  return new Date(Date.now() - days * MS_PER_DAY);
}

function pruneFeed() {
  const cutoff = cutoffDate(FEED_DAYS);
  for (let i = recognitions.length - 1; i >= 0; i--) {
    if (new Date(recognitions[i].createdAt) < cutoff) {
      recognitions.splice(i, 1);
    }
  }
}

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / MS_PER_DAY;
}

// ✅ CREAR RECONOCIMIENTO
router.post("/", (req, res) => {
  pruneFeed();

  const { recognizedUser, recognizedBy, reason } = req.body;

  if (!recognizedUser || !recognizedBy || !reason) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  // Regla 1: no consecutivo por mismo usuario
  if (lastTargetByGiver[recognizedBy] === recognizedUser) {
    return res.status(400).json({
      error: "No puedes reconocer a la misma persona dos veces seguidas"
    });
  }

  // Regla 2: 7 días antes de volver a reconocer
  if (daysSince(lastRecognizedAt[recognizedUser]) < COOLDOWN_DAYS) {
    return res.status(400).json({
      error: "Debes esperar 7 días para volver a reconocer a esta persona"
    });
  }

  const newRec = {
    id: Date.now(),
    recognizedUser,
    recognizedBy,
    reason,
    points: 10,
    createdAt: new Date().toISOString()
  };

  recognitions.push(newRec);

  userStats[recognizedUser] = (userStats[recognizedUser] || 0) + 10;
  lastRecognizedAt[recognizedUser] = newRec.createdAt;
  lastTargetByGiver[recognizedBy] = recognizedUser;

  res.json(newRec);
});

// ✅ FEED (solo 4 días)
router.get("/", (req, res) => {
  pruneFeed();
  res.json(recognitions);
});

// ✅ LEADERBOARD
router.get("/leaderboard", (req, res) => {
  const board = Object.entries(userStats)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);

  res.json(board);
});

module.exports = router;
