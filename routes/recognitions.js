const express = require("express");
const router = express.Router();

const recognitions = [];   // feed (solo últimos 4 días)
const userStats = {};      // puntos acumulados por usuario
const lastRecognizedAt = {}; // última vez que alguien fue reconocido (para regla 7 días)
const lastTargetByGiver = {}; // última persona reconocida por cada "giver" (para evitar consecutivo por el mismo giver)

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

function daysSince(isoDate) {
  if (!isoDate) return Infinity;
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff / MS_PER_DAY;
}

// POST /recognitions
router.post("/", (req, res) => {
  pruneFeed();

  const { recognizedUser, recognizedBy, reason } = req.body;

  if (!recognizedUser || !recognizedBy || !reason) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const target = String(recognizedUser).toLowerCase().trim();
  const giver = String(recognizedBy).toLowerCase().trim();

  // Regla A: el mismo "giver" no puede reconocer a la misma persona dos veces seguidas
  if (lastTargetByGiver[giver] && lastTargetByGiver[giver] === target) {
    return res.status(400).json({
      error: "No puedes reconocer a la misma persona dos veces seguidas"
    });
  }

  // Regla B: una persona no puede ser reconocida de manera continua -> cooldown 7 días
  const days = daysSince(lastRecognizedAt[target]);
  if (days < COOLDOWN_DAYS) {
    const remaining = Math.ceil(COOLDOWN_DAYS - days);
    return res.status(400).json({
      error: `Debes esperar al menos 7 días para volver a reconocer a esta persona (faltan ~${remaining} día(s))`
    });
  }

  const points = 10;
  const now = new Date().toISOString();

  const newRecognition = {
    id: (globalThis.crypto?.randomUUID?.() || String(Date.now())),
    recognizedUser: target,
    recognizedBy: giver,
    reason: String(reason).trim(),
    points,
    createdAt: now
  };

  recognitions.push(newRecognition);

  // puntos acumulados
  userStats[target] = (userStats[target] || 0) + points;

  // actualiza reglas
  lastRecognizedAt[target] = now;
  lastTargetByGiver[giver] = target;

  return res.status(201).json({
    message: "Reconocimiento creado correctamente",
    recognition: newRecognition,
    totalPoints: userStats[target]
  });
});

// GET /recognitions  (feed últimos 4 días)
router.get("/", (req, res) => {
  pruneFeed();
  res.json(recognitions);
});

// GET /recognitions/leaderboard  (puntos acumulados)
router.get("/leaderboard", (req, res) => {
  const leaderboard = Object.entries(userStats)
    .map(([user, points]) => ({ user, points }))
    .sort((a, b) => b.points - a.points);

  res.json(leaderboard);
});

module.exports = router;
