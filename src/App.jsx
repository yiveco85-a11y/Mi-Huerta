import React, { useState, useEffect, useCallback, useRef } from "react";

/* Shim de almacenamiento local: reemplaza el window.storage exclusivo
   de los artifacts de Claude por localStorage, disponible en cualquier
   WebView de Android (Capacitor) o navegador normal. */
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v === null ? null : { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};


/* ------------------------------------------------------------------ */
/* Catálogo de especies                                               */
/* ------------------------------------------------------------------ */
/* Intervalos de riego ajustados al clima de Medellín: temperaturas suaves
   (16-26°C) y humedad/lluvia frecuentes casi todo el año, por lo que las
   plantas necesitan riego algo menos seguido que en un clima cálido/seco. */
const SPECIES = {
  tomate: {
    label: "Tomate", emoji: "🍅", totalDays: 80, profile: "tall", waterEvery: 4,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: "#E8C24A", fruit: "#C1432A",
    hasFlower: true, hasFruit: true,
  },
  lechuga: {
    label: "Lechuga", emoji: "🥬", totalDays: 45, profile: "bushy", waterEvery: 3,
    leaf: "#5C8A3F", leafLight: "#A6CC6B", flower: null, fruit: null,
    hasFlower: false, hasFruit: false,
  },
  zanahoria: {
    label: "Zanahoria", emoji: "🥕", totalDays: 70, profile: "root", waterEvery: 5,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: null, fruit: "#D9782E",
    hasFlower: false, hasFruit: false, rootReveal: true,
  },
  girasol: {
    label: "Girasol", emoji: "🌻", totalDays: 90, profile: "tall", waterEvery: 5,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: "#E8A93B", fruit: "#6B4A2A",
    hasFlower: true, hasFruit: false, bigFlower: true,
  },
  albahaca: {
    label: "Albahaca", emoji: "🌿", totalDays: 55, profile: "bushy", waterEvery: 3,
    leaf: "#3F6B3A", leafLight: "#7FA85C", flower: "#F2EEDD", fruit: null,
    hasFlower: true, hasFruit: false, smallFlower: true,
  },
  aji: {
    label: "Ají", emoji: "🌶️", totalDays: 75, profile: "tall", waterEvery: 4,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: "#F2EEDD", fruit: "#B5592F",
    hasFlower: true, hasFruit: true, smallFlower: true,
  },
  pepino: {
    label: "Pepino", emoji: "🥒", totalDays: 60, profile: "tall", waterEvery: 3,
    leaf: "#3F7A4A", leafLight: "#7FBE7C", flower: "#E8C24A", fruit: "#4C7A3F",
    hasFlower: true, hasFruit: true, smallFlower: true,
  },
  cilantro: {
    label: "Cilantro", emoji: "🌿", totalDays: 40, profile: "bushy", waterEvery: 3,
    leaf: "#4C8A44", leafLight: "#9BCB79", flower: "#F2EEDD", fruit: null,
    hasFlower: true, hasFruit: false, smallFlower: true,
  },
  cebolla: {
    label: "Cebolla", emoji: "🧅", totalDays: 90, profile: "root", waterEvery: 5,
    leaf: "#4C8A5A", leafLight: "#8FC28F", flower: null, fruit: "#B5679A",
    hasFlower: false, hasFruit: false, rootReveal: true,
  },
  cebolla_larga: {
    label: "Cebolla larga", emoji: "🌱", totalDays: 70, profile: "bushy", waterEvery: 4,
    leaf: "#3F7A5A", leafLight: "#79B98F", flower: null, fruit: null,
    hasFlower: false, hasFruit: false, thinLeaf: true,
  },
  frijol: {
    label: "Fríjol", emoji: "🫘", totalDays: 70, profile: "tall", waterEvery: 4,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: "#E8C24A", fruit: "#6B8E3D",
    hasFlower: true, hasFruit: true, smallFlower: true,
  },
  maiz: {
    label: "Maíz", emoji: "🌽", totalDays: 95, profile: "tall", waterEvery: 5,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: null, fruit: "#E8C24A",
    hasFlower: false, hasFruit: true, tallStem: true,
  },
  papa: {
    label: "Papa", emoji: "🥔", totalDays: 100, profile: "root", waterEvery: 5,
    leaf: "#4C7A3F", leafLight: "#8FB86C", flower: "#C9A6D6", fruit: "#C9955A",
    hasFlower: true, hasFruit: false, smallFlower: true, rootReveal: true,
  },
};

const STAGES = [
  { key: "seed", max: 0.03, label: "Semilla" },
  { key: "germ", max: 0.15, label: "Germinando" },
  { key: "seedling", max: 0.40, label: "Plántula" },
  { key: "growth", max: 0.75, label: "Crecimiento" },
  { key: "flower", max: 0.97, label: "Floración" },
  { key: "ready", max: Infinity, label: "Lista para cosechar" },
];

const FERTILIZER_TYPES = ["Orgánico", "Compost", "Químico", "Foliar"];

const PALETTE = {
  bg: "#E3E6D4",
  card: "#FBF8EE",
  ink: "#2B2318",
  inkSoft: "#5B5140",
  clay: "#B5592F",
  clayDark: "#8C4023",
  soil: "#372A1C",
  sky: "#5B8BA6",
  line: "#D8D3BE",
  good: "#4C8A44",
  warn: "#D9A441",
  bad: "#B5592F",
  gold: "#C79A3B",
};

/* ------------------------------------------------------------------ */
/* Medallas                                                            */
/* ------------------------------------------------------------------ */
const BADGES = {
  primera_semilla: { emoji: "🌱", label: "Primera semilla", desc: "Sembraste tu primera planta",
    check: (s) => s.length >= 1 },
  jardin_variado: { emoji: "🌈", label: "Jardín variado", desc: "5 especies distintas a la vez",
    check: (s) => new Set(s.map((x) => x.species)).size >= 5 },
  buen_regador: { emoji: "💧", label: "Buen regador", desc: "20 riegos registrados en total",
    check: (s) => s.reduce((a, x) => a + (x.waterLog?.length || 0), 0) >= 20 },
  mano_verde: { emoji: "🌾", label: "Mano verde", desc: "10 fertilizaciones registradas",
    check: (s) => s.reduce((a, x) => a + (x.fertilizeLog?.length || 0), 0) >= 10 },
  fotografo: { emoji: "📸", label: "Fotógrafo de huerta", desc: "10 fotos de progreso subidas",
    check: (s) => s.reduce((a, x) => a + (x.photos?.length || 0), 0) >= 10 },
  primera_cosecha: { emoji: "🏆", label: "Primera cosecha", desc: "Una planta llegó lista para cosechar",
    check: (s) => s.some((x) => isReady(x)) },
  cosechador_experto: { emoji: "🥇", label: "Cosechador experto", desc: "5 plantas completaron su ciclo",
    check: (s) => s.filter((x) => isReady(x)).length >= 5 },
  huerta_grande: { emoji: "🏡", label: "Huerta grande", desc: "8 plantas creciendo a la vez",
    check: (s) => s.length >= 8 },
};

function isReady(seed) {
  const cfg = SPECIES[seed.species];
  if (!cfg) return false;
  const { raw } = getProgress(seed.plantedDate, cfg.totalDays);
  return raw >= 1;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
function getProgress(plantedISO, totalDays) {
  const planted = new Date(plantedISO + "T00:00:00");
  const now = new Date();
  const days = Math.max(0, (now - planted) / 86400000);
  const raw = days < 1 ? 0 : days / totalDays;
  return { days, raw: Math.max(0, raw) };
}

function getStage(progressRaw) {
  const p = Math.min(progressRaw, 1);
  return STAGES.find((s) => p <= s.max) || STAGES[STAGES.length - 1];
}

function withDefaults(seed) {
  const cfg = SPECIES[seed.species];
  return {
    ...seed,
    waterLog: seed.waterLog || [],
    fertilizeLog: seed.fertilizeLog || [],
    photos: seed.photos || [],
    wateringIntervalDays: seed.wateringIntervalDays || cfg.waterEvery,
  };
}

function getHealth(seed) {
  const cfg = SPECIES[seed.species];
  const { days } = getProgress(seed.plantedDate, cfg.totalDays);
  if (days < 1) return { status: "good", label: "Recién sembrada", emoji: "🌱" };
  const lastWaterISO = seed.waterLog?.length ? seed.waterLog[seed.waterLog.length - 1] : null;
  const lastWater = lastWaterISO ? new Date(lastWaterISO) : new Date(seed.plantedDate + "T00:00:00");
  const daysSince = (new Date() - lastWater) / 86400000;
  const interval = seed.wateringIntervalDays || cfg.waterEvery;
  if (daysSince <= interval) return { status: "good", label: "Saludable", emoji: "💚" };
  if (daysSince <= interval * 2) return { status: "warn", label: "Necesita agua", emoji: "💛" };
  return { status: "bad", label: "Marchitándose", emoji: "🥀" };
}

function timeAgo(iso) {
  const diffMs = new Date() - new Date(iso);
  const min = diffMs / 60000;
  if (min < 60) return `hace ${Math.max(1, Math.floor(min))} min`;
  const hr = min / 60;
  if (hr < 24) return `hace ${Math.floor(hr)} h`;
  const d = hr / 24;
  if (d < 30) return `hace ${Math.floor(d)} d`;
  return `hace ${Math.floor(d / 30)} mes(es)`;
}

function resizeImageFile(file, maxWidth = 480, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const LEVEL_XP = 30;
function levelFromXP(xp) {
  const level = 1 + Math.floor(xp / LEVEL_XP);
  const inLevel = xp % LEVEL_XP;
  return { level, inLevel, forNext: LEVEL_XP };
}

/* ------------------------------------------------------------------ */
/* Planta animada (elemento firma)                                    */
/* ------------------------------------------------------------------ */
function PlantSVG({ species, progressRaw, size = 140, watering = false, health = "good" }) {
  const cfg = SPECIES[species];
  const p = Math.min(progressRaw, 1);
  const stage = getStage(progressRaw);

  const leafColor = health === "bad" ? "#A68A4A" : health === "warn" ? "#7E9A55" : cfg.leaf;
  const leafLightColor = health === "bad" ? "#C9B673" : health === "warn" ? "#AECB86" : cfg.leafLight;

  const stemMax = cfg.tallStem ? 150 : cfg.profile === "tall" ? 128 : cfg.profile === "bushy" ? 62 : 46;
  const germinated = progressRaw > 0.03;
  const stemHeight = germinated ? Math.max(stemMax * 0.08, stemMax * p) : 0;

  const leafFractions =
    cfg.profile === "bushy" ? [0.35, 0.6, 0.85, 0.55] : [0.4, 0.7, 0.95];
  const leafThreshold = 0.15;

  const showFlower = cfg.hasFlower && progressRaw >= 0.7;
  const flowerOpen = progressRaw >= 0.85 ? 1 : 0.5;
  const showFruit = cfg.hasFruit && progressRaw >= 0.75;
  const ready = stage.key === "ready";
  const wilt = health === "bad" ? 6 : health === "warn" ? 2 : 0;

  return (
    <svg viewBox="0 0 200 230" width={size} height={(size * 230) / 200} style={{ overflow: "visible" }}>
      <style>{`
        @keyframes sway { 0%,100% { transform: rotate(${-1.6 - wilt}deg); } 50% { transform: rotate(${1.6 - wilt}deg); } }
        @keyframes drop { 0% { transform: translateY(0); opacity:1; } 100% { transform: translateY(26px); opacity:0; } }
        .sway-group { transform-origin: 100px 190px; animation: sway 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sway-group { animation: none; } }
        .leaf { transition: opacity 0.9s ease, transform 0.9s cubic-bezier(.34,1.4,.64,1); transform-box: fill-box; transform-origin: center; }
        .stem-rect { transition: y 1.3s ease-out, height 1.3s ease-out, fill 0.6s ease; }
        .flower-part { transition: opacity 1s ease, transform 1s cubic-bezier(.34,1.4,.64,1); transform-box: fill-box; transform-origin: center; }
      `}</style>

      {/* maceta */}
      <path d="M62,192 L138,192 L128,228 L72,228 Z" fill={PALETTE.clay} stroke={PALETTE.clayDark} strokeWidth="2" />
      <ellipse cx="100" cy="192" rx="39" ry="7" fill={PALETTE.clayDark} />
      <ellipse cx="100" cy="190" rx="35" ry="6" fill={PALETTE.soil} />

      <g className="sway-group">
        {!germinated && <ellipse cx="100" cy="187" rx="5" ry="3.5" fill="#6B4A2A" />}

        {germinated && (
          <rect
            className="stem-rect"
            x="97.5" y={190 - stemHeight} width="5" height={stemHeight}
            rx="2.5" fill={leafColor}
          />
        )}

        {germinated &&
          progressRaw >= leafThreshold &&
          leafFractions.map((f, i) => {
            const y = 190 - stemHeight * f;
            const side = i % 2 === 0 ? 1 : -1;
            const visible = progressRaw >= leafThreshold + i * 0.05;
            const rxv = cfg.thinLeaf ? 7 : cfg.profile === "bushy" ? 16 : 12;
            const ryv = cfg.thinLeaf ? 4 : cfg.profile === "bushy" ? 9 : 6;
            return (
              <ellipse
                key={i}
                className="leaf"
                cx={100 + side * (cfg.profile === "bushy" ? 20 : 15)}
                cy={y}
                rx={rxv}
                ry={ryv}
                fill={leafLightColor}
                transform={`rotate(${side * (28 + wilt * 4)} ${100 + side * (cfg.profile === "bushy" ? 20 : 15)} ${y})`}
                style={{ opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.3)" }}
              />
            );
          })}

        {showFlower && (
          <g className="flower-part" style={{ opacity: flowerOpen, transform: `scale(${flowerOpen})` }}>
            {cfg.bigFlower ? (
              <>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <ellipse key={a} cx="100" cy={190 - stemHeight - 22} rx="9" ry="4.5" fill={cfg.flower}
                    transform={`rotate(${a} 100 ${190 - stemHeight - 22})`} />
                ))}
                <circle cx="100" cy={190 - stemHeight - 22} r="9" fill="#6B4A2A" />
              </>
            ) : (
              <>
                <circle cx="94" cy={190 - stemHeight - 16} r={cfg.smallFlower ? 4 : 7} fill={cfg.flower} />
                <circle cx="106" cy={190 - stemHeight - 20} r={cfg.smallFlower ? 3.5 : 6} fill={cfg.flower} />
              </>
            )}
          </g>
        )}

        {showFruit && (
          <g className="flower-part" style={{ opacity: 1 }}>
            <circle cx="90" cy={190 - stemHeight * 0.75} r={ready ? 9 : 6} fill={cfg.fruit} />
            <circle cx="110" cy={190 - stemHeight * 0.55} r={ready ? 8 : 5} fill={cfg.fruit} />
          </g>
        )}

        {cfg.rootReveal && ready && (
          <path d="M94,190 Q100,204 100,214 Q100,204 106,190 Z" fill={cfg.fruit} />
        )}
      </g>

      {watering &&
        [70, 100, 130].map((x, i) => (
          <circle key={x} cx={x} cy="30" r="4" fill={PALETTE.sky}
            style={{ animation: `drop 0.9s ease-in ${i * 0.15}s forwards` }} />
        ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de maceta (vista jardín)                                   */
/* ------------------------------------------------------------------ */
function PotCard({ seed, onOpen }) {
  const s = withDefaults(seed);
  const cfg = SPECIES[s.species];
  const { days, raw } = getProgress(s.plantedDate, cfg.totalDays);
  const stage = getStage(raw);
  const pct = Math.min(100, Math.round(raw * 100));
  const health = getHealth(s);

  return (
    <button
      onClick={onOpen}
      style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}
      className="rounded-2xl p-3 flex flex-col items-center text-left w-full active:scale-95 transition-transform relative"
    >
      <span className="absolute top-2 right-2 text-sm">{health.emoji}</span>
      <PlantSVG species={s.species} progressRaw={raw} size={92} health={health.status} />
      <div className="mt-1 text-center w-full">
        <p style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-sm font-semibold truncate w-full">
          {s.name || cfg.label}
        </p>
        <p style={{ color: PALETTE.inkSoft }} className="text-[11px] mb-1">
          {stage.label} · día {Math.floor(days)}
        </p>
        <div style={{ background: PALETTE.line }} className="h-1.5 w-full rounded-full overflow-hidden">
          <div style={{ background: PALETTE.clay, width: `${pct}%` }} className="h-full transition-all duration-700" />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Vista de logros                                                    */
/* ------------------------------------------------------------------ */
function AchievementsView({ progress, onBack }) {
  const { level, inLevel, forNext } = levelFromXP(progress.xp);
  return (
    <div className="flex flex-col min-h-screen" style={{ background: PALETTE.bg }}>
      <div className="flex items-center px-3 py-3 sticky top-0 z-10" style={{ background: PALETTE.bg, borderBottom: `1px solid ${PALETTE.line}` }}>
        <button onClick={onBack} style={{ color: PALETTE.ink, background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}
          className="text-sm font-medium px-3 py-2 rounded-full active:scale-95 transition-transform">
          ← Jardín
        </button>
      </div>
      <div className="px-5 pt-4 pb-10">
        <h1 style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-2xl font-semibold mb-1">Logros</h1>
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}` }} className="rounded-2xl p-4 mb-5">
          <p style={{ color: PALETTE.inkSoft }} className="text-xs uppercase tracking-wide mb-1">Nivel de jardinero</p>
          <p style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold mb-2">Nivel {level}</p>
          <div style={{ background: PALETTE.line }} className="h-2 w-full rounded-full overflow-hidden">
            <div style={{ background: PALETTE.gold, width: `${(inLevel / forNext) * 100}%` }} className="h-full transition-all duration-700" />
          </div>
          <p style={{ color: PALETTE.inkSoft }} className="text-[11px] mt-1">{inLevel}/{forNext} XP para el siguiente nivel</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {Object.entries(BADGES).map(([key, b]) => {
            const unlocked = progress.badges.includes(key);
            return (
              <div key={key}
                style={{ background: unlocked ? PALETTE.card : "transparent", border: `1px solid ${unlocked ? PALETTE.line : PALETTE.line}`, opacity: unlocked ? 1 : 0.5 }}
                className="rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{unlocked ? b.emoji : "🔒"}</span>
                <div>
                  <p style={{ color: PALETTE.ink }} className="text-sm font-semibold">{b.label}</p>
                  <p style={{ color: PALETTE.inkSoft }} className="text-xs">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista detalle                                                      */
/* ------------------------------------------------------------------ */
function DetailView({ seed, onBack, onDelete, onWater, onFertilize, onAddPhoto, onSetInterval }) {
  const s = withDefaults(seed);
  const cfg = SPECIES[s.species];
  const { days, raw } = getProgress(s.plantedDate, cfg.totalDays);
  const stage = getStage(raw);
  const pct = Math.min(100, Math.round(raw * 100));
  const health = getHealth(s);
  const [watering, setWatering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("cuidado");
  const [fertChoice, setFertChoice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoCache, setPhotoCache] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (tab !== "fotos") return;
    s.photos.forEach(async (p) => {
      if (photoCache[p.id]) return;
      try {
        const res = await storage.get(`photo:${p.id}`, false);
        if (res && res.value) setPhotoCache((c) => ({ ...c, [p.id]: res.value }));
      } catch (e) { /* foto no disponible */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, s.photos.length]);

  const water = () => {
    setWatering(true);
    onWater(s.id);
    setTimeout(() => setWatering(false), 900);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await resizeImageFile(file);
      await onAddPhoto(s.id, dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const logEvents = [
    { type: "siembra", date: s.plantedDate + "T00:00:00", label: `Sembraste ${cfg.label.toLowerCase()}`, emoji: "🌱" },
    ...s.waterLog.map((d) => ({ type: "riego", date: d, label: "Riego registrado", emoji: "💧" })),
    ...s.fertilizeLog.map((f) => ({ type: "fert", date: f.date, label: `Fertilización · ${f.type}`, emoji: "🌾" })),
    ...s.photos.map((p) => ({ type: "foto", date: p.date, label: "Foto de progreso agregada", emoji: "📸" })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const lastWater = s.waterLog.length ? s.waterLog[s.waterLog.length - 1] : null;
  const lastFert = s.fertilizeLog.length ? s.fertilizeLog[s.fertilizeLog.length - 1] : null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: PALETTE.bg }}>
      <div className="flex items-center justify-between px-3 py-3 sticky top-0 z-10"
        style={{ background: PALETTE.bg, borderBottom: `1px solid ${PALETTE.line}` }}>
        <button onClick={onBack} style={{ color: PALETTE.ink, background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}
          className="text-sm font-medium px-3 py-2 rounded-full active:scale-95 transition-transform">
          ← Jardín
        </button>
        <button onClick={() => setConfirmDelete(true)} style={{ color: PALETTE.clayDark, background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}
          className="text-sm font-medium px-3 py-2 rounded-full active:scale-95 transition-transform">
          Eliminar
        </button>
      </div>

      <div className="flex flex-col items-center pt-2 pb-2">
        <PlantSVG species={s.species} progressRaw={raw} size={180} watering={watering} health={health.status} />
        <span style={{ color: health.status === "bad" ? PALETTE.bad : health.status === "warn" ? PALETTE.warn : PALETTE.good }}
          className="text-xs font-medium mt-1">
          {health.emoji} {health.label}
        </span>
      </div>

      <div style={{ background: PALETTE.card }} className="rounded-t-3xl flex-1 px-5 pt-5 pb-8">
        <p style={{ color: PALETTE.inkSoft, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs uppercase tracking-wide">
          {cfg.emoji} {cfg.label}
        </p>
        <h1 style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-2xl font-semibold mb-1">
          {s.name || cfg.label}
        </h1>
        <p style={{ color: PALETTE.clayDark }} className="text-sm font-medium mb-4">{stage.label}</p>

        <div style={{ background: PALETTE.line }} className="h-2 w-full rounded-full overflow-hidden mb-1">
          <div style={{ background: PALETTE.clay, width: `${pct}%` }} className="h-full transition-all duration-700" />
        </div>
        <div className="flex justify-between text-xs mb-5" style={{ color: PALETTE.inkSoft }}>
          <span>Día {Math.floor(days)}</span>
          <span>{pct >= 100 ? "¡Lista!" : `~${Math.max(0, Math.ceil(cfg.totalDays - days))} días para cosecha`}</span>
        </div>

        {/* pestañas */}
        <div className="flex gap-2 mb-4">
          {[["cuidado", "Cuidado"], ["fotos", "Fotos"], ["bitacora", "Bitácora"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                background: tab === key ? PALETTE.clay : "transparent",
                color: tab === key ? "#fff" : PALETTE.inkSoft,
                border: `1px solid ${tab === key ? PALETTE.clay : PALETTE.line}`,
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-full">
              {label}
            </button>
          ))}
        </div>

        {tab === "cuidado" && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {STAGES.map((st) => {
                const passed = raw >= st.max || (st.key === stage.key);
                const current = st.key === stage.key;
                return (
                  <span key={st.key}
                    style={{
                      background: current ? PALETTE.clay : passed ? "#DCE5CB" : "transparent",
                      color: current ? "#fff" : passed ? PALETTE.ink : PALETTE.inkSoft,
                      border: `1px solid ${current ? PALETTE.clay : PALETTE.line}`,
                    }}
                    className="text-[11px] px-2 py-1 rounded-full">
                    {st.label}
                  </span>
                );
              })}
            </div>

            <div style={{ background: PALETTE.bg, border: `1px solid ${PALETTE.line}` }} className="rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p style={{ color: PALETTE.ink }} className="text-sm font-semibold">💧 Riego</p>
                <span style={{ color: PALETTE.inkSoft }} className="text-xs">{s.waterLog.length} registrado(s)</span>
              </div>
              <p style={{ color: PALETTE.inkSoft }} className="text-xs mb-2">
                {lastWater ? `Último riego ${timeAgo(lastWater)}` : "Todavía no la has regado"}
              </p>
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: PALETTE.inkSoft }} className="text-xs">Regar cada</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => onSetInterval(s.id, Math.max(1, s.wateringIntervalDays - 1))}
                    style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, color: PALETTE.ink }}
                    className="w-7 h-7 rounded-full text-sm">−</button>
                  <span style={{ color: PALETTE.ink }} className="text-sm w-16 text-center">{s.wateringIntervalDays} día(s)</span>
                  <button onClick={() => onSetInterval(s.id, s.wateringIntervalDays + 1)}
                    style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, color: PALETTE.ink }}
                    className="w-7 h-7 rounded-full text-sm">+</button>
                </div>
              </div>
              <button onClick={water} style={{ background: PALETTE.sky }}
                className="w-full text-white rounded-xl py-3 font-medium active:scale-98 transition-transform">
                💧 Regar ahora
              </button>
            </div>

            <div style={{ background: PALETTE.bg, border: `1px solid ${PALETTE.line}` }} className="rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p style={{ color: PALETTE.ink }} className="text-sm font-semibold">🌾 Fertilización</p>
                <span style={{ color: PALETTE.inkSoft }} className="text-xs">{s.fertilizeLog.length} registrada(s)</span>
              </div>
              <p style={{ color: PALETTE.inkSoft }} className="text-xs mb-3">
                {lastFert ? `Última: ${lastFert.type} · ${timeAgo(lastFert.date)}` : "Todavía no la has fertilizado"}
              </p>
              {!fertChoice ? (
                <button onClick={() => setFertChoice(true)} style={{ background: PALETTE.good }}
                  className="w-full text-white rounded-xl py-3 font-medium active:scale-98 transition-transform">
                  🌾 Fertilizar
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {FERTILIZER_TYPES.map((t) => (
                    <button key={t} onClick={() => { onFertilize(s.id, t); setFertChoice(false); }}
                      style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, color: PALETTE.ink }}
                      className="rounded-xl py-2 text-xs font-medium active:scale-95 transition-transform">
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label style={{ color: PALETTE.inkSoft }} className="text-xs block mb-1">Fecha de siembra</label>
            <p style={{ color: PALETTE.ink, background: "#fff", border: `1px solid ${PALETTE.line}` }} className="w-full rounded-xl px-3 py-2 text-sm">
              {new Date(s.plantedDate + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </>
        )}

        {tab === "fotos" && (
          <div>
            <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" id="photo-input" />
            <label htmlFor="photo-input"
              style={{ background: PALETTE.clay }}
              className="block text-center text-white rounded-xl py-3 font-medium mb-4 active:scale-98 transition-transform cursor-pointer">
              {uploading ? "Subiendo…" : "📷 Agregar foto de progreso"}
            </label>
            {s.photos.length === 0 ? (
              <p style={{ color: PALETTE.inkSoft }} className="text-sm text-center py-8">Todavía no hay fotos de esta planta.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[...s.photos].reverse().map((p) => (
                  <button key={p.id} onClick={() => photoCache[p.id] && setLightbox(photoCache[p.id])}
                    style={{ background: PALETTE.bg, border: `1px solid ${PALETTE.line}` }}
                    className="aspect-square rounded-lg overflow-hidden flex items-center justify-center">
                    {photoCache[p.id] ? (
                      <img src={photoCache[p.id]} alt="Progreso" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs" style={{ color: PALETTE.inkSoft }}>…</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "bitacora" && (
          <div className="flex flex-col gap-2">
            {logEvents.map((ev, i) => (
              <div key={i} style={{ background: PALETTE.bg, border: `1px solid ${PALETTE.line}` }} className="rounded-xl px-3 py-2 flex items-center gap-3">
                <span className="text-lg">{ev.emoji}</span>
                <div className="flex-1">
                  <p style={{ color: PALETTE.ink }} className="text-sm">{ev.label}</p>
                  <p style={{ color: PALETTE.inkSoft }} className="text-[11px]">{timeAgo(ev.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 flex items-end justify-center z-20" style={{ background: "rgba(0,0,0,0.35)" }}>
            <div style={{ background: PALETTE.card }} className="w-full max-w-sm rounded-t-3xl p-5">
              <p style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-lg font-semibold mb-1">¿Quitar esta planta?</p>
              <p style={{ color: PALETTE.inkSoft }} className="text-sm mb-4">Esta acción no se puede deshacer.</p>
              <button onClick={() => onDelete(s.id)} style={{ background: PALETTE.clayDark }}
                className="w-full text-white rounded-xl py-3 font-medium mb-2">Sí, eliminar</button>
              <button onClick={() => setConfirmDelete(false)} style={{ color: PALETTE.inkSoft, border: `1px solid ${PALETTE.line}` }}
                className="w-full rounded-xl py-3 font-medium">Cancelar</button>
            </div>
          </div>
        )}

        {lightbox && (
          <div onClick={() => setLightbox(null)} className="fixed inset-0 flex items-center justify-center z-30 p-6" style={{ background: "rgba(0,0,0,0.75)" }}>
            <img src={lightbox} alt="Foto ampliada" className="max-w-full max-h-full rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vista agregar                                                      */
/* ------------------------------------------------------------------ */
function AddView({ onCancel, onAdd }) {
  const [species, setSpecies] = useState("tomate");
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="flex flex-col min-h-screen px-5 pt-5 pb-8" style={{ background: PALETTE.bg }}>
      <button onClick={onCancel} style={{ color: PALETTE.inkSoft }} className="text-sm mb-3 self-start">← Cancelar</button>
      <h1 style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-2xl font-semibold mb-4">Sembrar algo nuevo</h1>

      <p style={{ color: PALETTE.inkSoft }} className="text-xs uppercase tracking-wide mb-2">Especie</p>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {Object.entries(SPECIES).map(([key, cfg]) => (
          <button key={key} onClick={() => setSpecies(key)}
            style={{
              background: species === key ? PALETTE.clay : PALETTE.card,
              border: `1px solid ${species === key ? PALETTE.clay : PALETTE.line}`,
              color: species === key ? "#fff" : PALETTE.ink,
            }}
            className="rounded-xl py-3 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <span className="text-xl">{cfg.emoji}</span>
            <span className="text-[11px] font-medium text-center leading-tight">{cfg.label}</span>
          </button>
        ))}
      </div>

      <label style={{ color: PALETTE.inkSoft }} className="text-xs block mb-1">Nombre (opcional)</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={SPECIES[species].label}
        style={{ border: `1px solid ${PALETTE.line}`, color: PALETTE.ink, background: PALETTE.card }}
        className="w-full rounded-xl px-3 py-2 text-sm mb-4" />

      <label style={{ color: PALETTE.inkSoft }} className="text-xs block mb-1">Fecha de siembra</label>
      <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)}
        style={{ border: `1px solid ${PALETTE.line}`, color: PALETTE.ink, background: PALETTE.card }}
        className="w-full rounded-xl px-3 py-2 text-sm mb-3" />

      <p style={{ color: PALETTE.inkSoft, background: PALETTE.card, border: `1px solid ${PALETTE.line}` }} className="text-[11px] rounded-xl px-3 py-2 mb-6">
        💧 El horario de riego sugerido ya está ajustado al clima húmedo de Medellín. Podés cambiarlo por planta desde la pestaña "Cuidado".
      </p>

      <button onClick={() => onAdd({ species, name: name.trim(), plantedDate: date })} style={{ background: PALETTE.clay }}
        className="w-full text-white rounded-xl py-3 font-medium active:scale-98 transition-transform">
        Sembrar 🌱
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App principal                                                      */
/* ------------------------------------------------------------------ */
export default function App() {
  const [seeds, setSeeds] = useState([]);
  const [progress, setProgress] = useState({ xp: 0, badges: [] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("garden");
  const [selectedId, setSelectedId] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get("garden-seeds", false);
        if (res && res.value) setSeeds(JSON.parse(res.value));
      } catch (e) { /* sin datos previos */ }
      try {
        const p = await storage.get("garden-progress", false);
        if (p && p.value) setProgress(JSON.parse(p.value));
      } catch (e) { /* sin progreso previo */ }
      setLoading(false);
    })();
  }, []);

  const persistSeeds = useCallback(async (next) => {
    setSeeds(next);
    try { await storage.set("garden-seeds", JSON.stringify(next), false); }
    catch (e) { console.error("No se pudo guardar", e); }
  }, []);

  const persistProgress = useCallback(async (next) => {
    setProgress(next);
    try { await storage.set("garden-progress", JSON.stringify(next), false); }
    catch (e) { console.error("No se pudo guardar progreso", e); }
  }, []);

  const addXPAndBadges = useCallback((xpGain, seedsForCheck) => {
    setProgress((prev) => {
      let xp = prev.xp + xpGain;
      const unlocked = [...prev.badges];
      Object.entries(BADGES).forEach(([key, b]) => {
        if (!unlocked.includes(key) && b.check(seedsForCheck)) {
          unlocked.push(key);
          xp += 10;
        }
      });
      const next = { xp, badges: unlocked };
      storage.set("garden-progress", JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, []);

  const addSeed = (data) => {
    const next = [...seeds, {
      id: `${Date.now()}`, waterLog: [], fertilizeLog: [], photos: [],
      wateringIntervalDays: SPECIES[data.species].waterEvery, ...data,
    }];
    persistSeeds(next);
    addXPAndBadges(0, next);
    setView("garden");
  };

  const deleteSeed = async (id) => {
    const seed = seeds.find((s) => s.id === id);
    if (seed?.photos?.length) {
      for (const p of seed.photos) {
        try { await storage.delete(`photo:${p.id}`, false); } catch (e) { /* ok */ }
      }
    }
    persistSeeds(seeds.filter((s) => s.id !== id));
    setView("garden");
    setSelectedId(null);
  };

  const waterSeed = (id) => {
    const next = seeds.map((s) => s.id === id ? { ...s, waterLog: [...(s.waterLog || []), new Date().toISOString()] } : s);
    persistSeeds(next);
    addXPAndBadges(1, next);
  };

  const fertilizeSeed = (id, type) => {
    const next = seeds.map((s) => s.id === id
      ? { ...s, fertilizeLog: [...(s.fertilizeLog || []), { date: new Date().toISOString(), type }] }
      : s);
    persistSeeds(next);
    addXPAndBadges(2, next);
  };

  const addPhoto = async (id, dataUrl) => {
    const photoId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try { await storage.set(`photo:${photoId}`, dataUrl, false); }
    catch (e) { console.error("No se pudo guardar la foto", e); return; }
    const next = seeds.map((s) => s.id === id
      ? { ...s, photos: [...(s.photos || []), { id: photoId, date: new Date().toISOString() }] }
      : s);
    persistSeeds(next);
    addXPAndBadges(1, next);
  };

  const setInterval_ = (id, days) => {
    persistSeeds(seeds.map((s) => s.id === id ? { ...s, wateringIntervalDays: days } : s));
  };

  const selected = seeds.find((s) => s.id === selectedId);
  const { level } = levelFromXP(progress.xp);

  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh" }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Karla:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Karla', sans-serif; }
      `}</style>

      {loading && (
        <div className="flex items-center justify-center min-h-screen" style={{ color: PALETTE.inkSoft }}>Cargando huerta…</div>
      )}

      {!loading && view === "garden" && (
        <div className="px-5 pt-6 pb-10">
          <div className="flex items-center justify-between mb-1">
            <h1 style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-3xl font-semibold">Mi Huerta</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("achievements")}
                style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, color: PALETTE.ink }}
                className="text-xs font-medium px-3 py-2 rounded-full active:scale-95 transition-transform">
                🏆 Nv. {level}
              </button>
              <button onClick={() => setView("add")} style={{ background: PALETTE.clay }}
                className="text-white w-10 h-10 rounded-full text-xl leading-none active:scale-90 transition-transform">+</button>
            </div>
          </div>
          <p style={{ color: PALETTE.inkSoft }} className="text-sm mb-5">
            {seeds.length === 0 ? "Todavía no sembraste nada." : `${seeds.length} planta${seeds.length === 1 ? "" : "s"} creciendo`}
          </p>

          {seeds.length === 0 ? (
            <div className="flex flex-col items-center text-center mt-16">
              <span className="text-5xl mb-3">🌱</span>
              <p style={{ color: PALETTE.ink, fontFamily: "'Fraunces', serif" }} className="text-lg font-medium mb-1">Tu huerta está vacía</p>
              <p style={{ color: PALETTE.inkSoft }} className="text-sm mb-5 max-w-[240px]">Tocá el botón + para sembrar tu primera semilla y verla crecer.</p>
              <button onClick={() => setView("add")} style={{ background: PALETTE.clay }} className="text-white rounded-xl px-5 py-3 font-medium">
                Sembrar mi primera planta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {seeds.map((s) => (
                <PotCard key={s.id} seed={s} onOpen={() => { setSelectedId(s.id); setView("detail"); }} />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && view === "add" && <AddView onCancel={() => setView("garden")} onAdd={addSeed} />}

      {!loading && view === "achievements" && <AchievementsView progress={progress} onBack={() => setView("garden")} />}

      {!loading && view === "detail" && selected && (
        <DetailView
          seed={selected}
          onBack={() => setView("garden")}
          onDelete={deleteSeed}
          onWater={waterSeed}
          onFertilize={fertilizeSeed}
          onAddPhoto={addPhoto}
          onSetInterval={setInterval_}
        />
      )}
    </div>
  );
}
