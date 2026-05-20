const express = require("express");
const router = express.Router();

const recognitions = [];          // feed (últimos 4 días)
const userStats = {};             // puntos acumulados por persona
const lastRecognizedAt = {};      // última vez que alguien fue reconocido
const lastTargetByGiver = {};     // evita reconocer consecutivo por el mismo giver

const FEED_DAYS = 4;
const COOLDOWN_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const IMPACT_VALUES = new Set([
  "inclusion",
  "mastery",
  "purpose",
  "action",
  "curiosity",
  "teamwork"
]);

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

function daysSince(dateIso) {
  if (!dateIso) return Infinity;
  return (Date.now() - new Date(dateIso).getTime()) / MS_PER_DAY;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ✅ POST /recognitions
router.post("/", (req, res) => {
  pruneFeed();

  const { recognizedUser, recognizedBy, reason, impactValue } = req.body;

  if (!recognizedUser || !recognizedBy || !reason) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const target = String(recognizedUser).trim();
  const giver = String(recognizedBy).trim();
  const value = String(impactValue || "").trim().toLowerCase();

  // Regla nueva: no auto-reconocimiento
  if (target.toLowerCase() === giver.toLowerCase()) {
    return res.status(400).json({ error: "No puedes felicitarte a ti mismo" });
  }

  if (!IMPACT_VALUES.has(value)) {
    return res.status(400).json({
      error: "Selecciona un valor IMPACT válido (Inclusion, Mastery, Purpose, Action, Curiosity, Teamwork)"
    });
  }

  // Regla: no consecutivo por el mismo giver
  if (lastTargetByGiver[giver] && lastTargetByGiver[giver].toLowerCase() === target.toLowerCase()) {
    return res.status(400).json({
      error: "No puedes reconocer a la misma persona dos veces seguidas"
    });
  }

  // Regla: cooldown 7 días por persona reconocida
  const days = daysSince(lastRecognizedAt[target]);
  if (days < COOLDOWN_DAYS) {
    const remaining = Math.ceil(COOLDOWN_DAYS - days);
    return res.status(400).json({
      error: `Debes esperar 7 días para volver a reconocer a esta persona (faltan ~${remaining} día(s))`
    });
  }

  const now = new Date().toISOString();
  const points = 1; // ✅ ahora 1 en 1

  const newRec = {
    id: makeId(),
    recognizedUser: target,
    recognizedBy: giver,
    reason: String(reason).trim(),
    impactValue: value,
    points,
    likes: 0,
    createdAt: now
  };

  recognitions.push(newRec);

  userStats[target] = (userStats[target] || 0) + points;
  lastRecognizedAt[target] = now;
  lastTargetByGiver[giver] = target;

  return res.status(201).json(newRec);
});

// ✅ GET /recognitions (feed últimos 4 días)
router.get("/", (req, res) => {
  pruneFeed();
  res.json(recognitions);
});

// ✅ GET /recognitions/leaderboard
router.get("/leaderboard", (req, res) => {
  const board = Object.entries(userStats)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);

  res.json(board);
});

// ✅ GET /recognitions/stats  (para panel "pendientes")
router.get("/stats", (req, res) => {
  // no necesitamos prune aquí, stats es acumulado
  res.json({
    pointsByName: userStats,
    lastRecognizedAt: lastRecognizedAt
  });
});

// ✅ POST /recognitions/:id/like
router.post("/:id/like", (req, res) => {
  pruneFeed();
  const { id } = req.params;

  const rec = recognitions.find(r => r.id === id);
  if (!rec) {
    return res.status(404).json({ error: "Reconocimiento no encontrado (tal vez expiró)" });
  }

  rec.likes = (rec.likes || 0) + 1;
  return res.json({ id: rec.id, likes: rec.likes });
});

module.exports = router;
