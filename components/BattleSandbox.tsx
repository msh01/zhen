"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Battle, BattleUnit } from "@/data/battles";

type BattleSandboxProps = {
  battle: Battle;
  onBack: () => void;
};

type Point = { x: number; y: number };

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 700;
const SEEK_TIME_UNITS_PER_SECOND = 30;
const STEP_TIME_UNITS = 6;

const PLAYBACK_SPEEDS = {
  slow: { label: "慢", timeUnitsPerSecond: 3.2 },
  normal: { label: "中", timeUnitsPerSecond: 5 },
  fast: { label: "快", timeUnitsPerSecond: 8 }
} as const;

const UNIT_SYMBOL: Record<BattleUnit["kind"], string> = {
  infantry: "步",
  cavalry: "骑",
  armor: "甲",
  naval: "舰",
  air: "空"
};

const TERRAIN_LABEL_OFFSETS: Record<string, { x: number; y: number; anchor?: "start" | "middle" | "end" }> = {
  丹水山地: { x: 24, y: -18, anchor: "middle" },
  韩王山: { x: 16, y: -20, anchor: "middle" },
  丹水: { x: 10, y: -18, anchor: "middle" },
  赵军粮道: { x: 28, y: -18, anchor: "start" },
  秦军隐蔽迂回线: { x: -34, y: -20, anchor: "end" },
  南侧穿插线: { x: 20, y: 20, anchor: "start" },
  长平: { x: 26, y: -14, anchor: "start" },
  故关: { x: 18, y: -14, anchor: "start" },
  秦垒: { x: 22, y: -18, anchor: "start" },
  赵垒: { x: -22, y: -18, anchor: "end" }
};

const UNIT_LABEL_OFFSETS: Record<string, { x: number; y: number; anchor?: "start" | "end" }> = {
  "qin-center": { x: 26, y: -16, anchor: "start" },
  "qin-feint": { x: 28, y: 2, anchor: "start" },
  "qin-north-wing": { x: 26, y: 2, anchor: "start" },
  "qin-south-wing": { x: 28, y: 6, anchor: "start" },
  "qin-blockade": { x: 26, y: 2, anchor: "start" },
  "zhao-vanguard": { x: -28, y: -12, anchor: "end" },
  "zhao-main": { x: -28, y: 4, anchor: "end" },
  "zhao-camp": { x: -28, y: 18, anchor: "end" },
  "zhao-supply": { x: -28, y: 2, anchor: "end" }
};

const CHANGPING_LABEL_SETS = [
  { until: 18, ids: ["qin-center", "qin-north-wing", "qin-south-wing", "zhao-main"] },
  { until: 38, ids: ["qin-feint", "zhao-vanguard", "zhao-main"] },
  { until: 58, ids: ["qin-center", "qin-feint", "zhao-main"] },
  { until: 72, ids: ["qin-north-wing", "qin-south-wing", "zhao-main"] },
  { until: 88, ids: ["qin-blockade", "zhao-supply", "zhao-main"] },
  { until: Number.POSITIVE_INFINITY, ids: ["qin-center", "qin-blockade", "zhao-main"] }
];

function sx(x: number) {
  return (x / 100) * VIEWBOX_WIDTH;
}

function sy(y: number) {
  return (y / 100) * VIEWBOX_HEIGHT;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function pct(value: number) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function phase(time: number, start: number, end: number) {
  return clamp01((time - start) / (end - start || 1));
}

function interpolatePath(unit: BattleUnit, time: number) {
  const path = unit.path;
  const first = path[0];
  const last = path[path.length - 1];
  if (time <= first.t) return first;
  if (time >= last.t) return last;

  const span = last.t - first.t || 1;
  const mix = gsap.parseEase("power1.inOut")((time - first.t) / span);

  return {
    x: first.x + (last.x - first.x) * mix,
    y: first.y,
    t: time
  };
}

function mapUnitName(name: string) {
  return name
    .replace(/^秦军/, "")
    .replace(/^赵军/, "")
    .replace(/部队$/, "")
    .replace("赵括主力", "赵主力")
    .replace("正面牵制", "正面")
    .replace("断粮封锁", "封锁");
}

function terrainColors(tone: Battle["mapTone"]) {
  switch (tone) {
    case "island":
      return { base: "#d7edf4", grid: "#91b8c8", contour: "#6f9cad" };
    case "europe":
      return { base: "#dfe8df", grid: "#9caf9e", contour: "#7b937f" };
    case "coast":
      return { base: "#d8ece8", grid: "#89aaa3", contour: "#6e938c" };
    default:
      return { base: "#e6dfd0", grid: "#b6ad96", contour: "#92876e" };
  }
}

function pathD(points: Point[]) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${sx(point.x)} ${sy(point.y)}`).join(" ");
}

function polygonPoints(points: Point[]) {
  return points.map((point) => `${sx(point.x)},${sy(point.y)}`).join(" ");
}

function terrainAnchor(points: Point[]) {
  return points[Math.floor(points.length / 2)] ?? points[0];
}

function labelWidth(label: string, fontSize = 13) {
  return label.length * fontSize + 16;
}

function unitLabelIds(battle: Battle, time: number) {
  if (battle.id !== "changping") {
    return new Set(battle.units.map((unit) => unit.id));
  }

  const labelSet = CHANGPING_LABEL_SETS.find((set) => time < set.until) ?? CHANGPING_LABEL_SETS[0];
  return new Set(labelSet.ids);
}

function unitFill(unit: BattleUnit) {
  if (unit.side === "blue") return "#1f66d8";
  if (unit.side === "red") return "#c71926";
  if (unit.side === "gold") return "#d59b1f";
  return "#17834a";
}

function unitLabel(unit: BattleUnit) {
  const side = unit.name.includes("秦") ? "秦军" : unit.name.includes("赵") ? "赵军" : "";
  const shortName = mapUnitName(unit.name).replace(/^秦/, "").replace(/^赵/, "");
  return `${side}${UNIT_SYMBOL[unit.kind]} ${shortName}`.trim();
}

function eventWindow(battle: Battle, time: number) {
  const index = Math.max(0, battle.events.findLastIndex((event) => event.t <= time));
  const current = battle.events[index] ?? battle.events[0];
  const next = battle.events[index + 1];
  const end = next?.t ?? battle.duration;
  return {
    index,
    current,
    next,
    progress: phase(time, current.t, end)
  };
}

function trailPoints(unit: BattleUnit, time: number) {
  const current = interpolatePath(unit, time);
  return [unit.path[0], current];
}

function Arrow({
  from,
  to,
  color,
  opacity
}: {
  from: Point;
  to: Point;
  color: string;
  opacity: number;
}) {
  const x1 = sx(from.x);
  const y1 = sy(from.y);
  const x2 = sx(to.x);
  const y2 = sy(to.y);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 18;
  const wing = 0.55;
  const p1 = `${x2},${y2}`;
  const p2 = `${x2 - Math.cos(angle - wing) * head},${y2 - Math.sin(angle - wing) * head}`;
  const p3 = `${x2 - Math.cos(angle + wing) * head},${y2 - Math.sin(angle + wing) * head}`;

  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <polygon points={`${p1} ${p2} ${p3}`} fill={color} />
    </g>
  );
}

function ChangpingDynamics({ time }: { time: number }) {
  const lure = phase(time, 12, 34);
  const wing = phase(time, 30, 64);
  const cutSupply = phase(time, 56, 76);
  const encircle = phase(time, 66, 96);
  const pulse = 0.62 + Math.sin(time * 0.28) * 0.22;

  return (
    <g aria-label="长平动态态势">
      <ellipse
        cx={sx(55)}
        cy={sy(50)}
        rx={sx(7 + encircle * 12)}
        ry={sy(5 + encircle * 8)}
        fill="none"
        stroke="#f06b57"
        strokeWidth={2 + encircle * 5}
        opacity={encircle * 0.32 * pulse}
      />
      <ellipse
        cx={sx(55)}
        cy={sy(50)}
        rx={sx(9 + encircle * 6)}
        ry={sy(7 + encircle * 4)}
        fill="#f06b57"
        opacity={encircle * 0.05}
      />

      <line
        x1={sx(73)}
        y1={sy(76)}
        x2={sx(53)}
        y2={sy(53)}
        stroke="#2d8f57"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="18 18"
        opacity={0.18 - cutSupply * 0.1}
      />
      <g opacity={cutSupply}>
        <line x1={sx(61) - 16} y1={sy(62) - 16} x2={sx(61) + 16} y2={sy(62) + 16} stroke="#c02828" strokeWidth={8} strokeLinecap="round" />
        <line x1={sx(61) + 16} y1={sy(62) - 16} x2={sx(61) - 16} y2={sy(62) + 16} stroke="#c02828" strokeWidth={8} strokeLinecap="round" />
      </g>

      <Arrow from={{ x: 32, y: 42 }} to={{ x: 47, y: 48 }} color="#f06b57" opacity={lure * 0.52} />
      <Arrow from={{ x: 42, y: 25 }} to={{ x: 66, y: 42 }} color="#e3b341" opacity={wing * 0.54} />
      <Arrow from={{ x: 39, y: 71 }} to={{ x: 66, y: 55 }} color="#e3b341" opacity={wing * 0.54} />
      <Arrow from={{ x: 75, y: 48 }} to={{ x: 55, y: 50 }} color="#5fb4ff" opacity={lure * 0.42} />
    </g>
  );
}

function BattleMap({ battle, time }: { battle: Battle; time: number }) {
  const chapter = eventWindow(battle, time);
  const visibleLabels = unitLabelIds(battle, time);
  const activeUnits = battle.units.filter((unit) => time >= unit.path[0].t - 1);

  return (
    <svg
      className="block size-full"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={`${battle.name} SVG 沙盘动画`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx={28} fill="#f4faf6" />
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx={28} fill="#fff" opacity={0.22} />
      <line x1={VIEWBOX_WIDTH / 2} y1={0} x2={VIEWBOX_WIDTH / 2} y2={VIEWBOX_HEIGHT} stroke="#aeb9b4" strokeWidth={2} strokeDasharray="14 22" opacity={0.36} />

      <text x={VIEWBOX_WIDTH * 0.64} y={VIEWBOX_HEIGHT * 0.36} fill="#fff" fontSize={28} fontWeight={700} letterSpacing={2} opacity={0.78}>
        {battle.coverFocus.toUpperCase()}
      </text>

      <g aria-label="事件日志" transform="translate(50 42)">
        <rect width={500} height={54} rx={10} fill="#555a58" opacity={0.9} />
        <text x={24} y={35} fill="#fff" fontSize={20} fontWeight={800}>
          事件日志: {chapter.current.title}
        </text>
      </g>

      <g aria-label="当前状态" transform="translate(750 52)">
        <text x={0} y={0} fill="#1d1d1f" fontSize={13} fontWeight={700}>
          当前时间
        </text>
        <text x={0} y={31} fill="#1d1d1f" fontSize={20} fontWeight={800}>
          T+{Math.round(time)}
        </text>
        <text x={100} y={0} fill="#1d1d1f" fontSize={13} fontWeight={700}>
          战场状态
        </text>
        <text x={100} y={31} fill="#1d1d1f" fontSize={20} fontWeight={800}>
          {chapter.next ? "推演中" : "已完成"}
        </text>
      </g>

      <g aria-label="移动轨迹">
        {activeUnits.map((unit) => {
          const points = trailPoints(unit, time);
          return (
            <path
              key={unit.id}
              d={pathD(points)}
              fill="none"
              stroke={unitFill(unit)}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={visibleLabels.has(unit.id) ? 0.28 : 0.12}
            />
          );
        })}
      </g>

      <g aria-label="部队">
        {activeUnits.map((unit) => {
          const position = interpolatePath(unit, time);
          const showLabel = visibleLabels.has(unit.id);
          const color = unitFill(unit);
          const label = unitLabel(unit);
          const x = sx(position.x);
          const y = sy(position.y);
          const size = showLabel ? 48 : 32;
          const labelW = labelWidth(label, 12) + 10;

          return (
            <g key={unit.id} transform={`translate(${x} ${y})`} opacity={showLabel ? 1 : 0.42}>
              <rect x={-size * 0.62} y={-size / 2 - 16} width={size * 1.24} height={7} rx={1} fill="#0d6f37" />
              {unit.side === "blue" || unit.side === "gold" ? (
                <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={3} fill={color} />
              ) : (
                <circle r={size / 2} fill={color} />
              )}
              <text x={0} y={6} fill="#fff" fontSize={showLabel ? 25 : 17} fontWeight={800} textAnchor="middle">
                {UNIT_SYMBOL[unit.kind]}
              </text>
              {showLabel && (
                <>
                  <rect x={-labelW / 2} y={size / 2 + 8} width={labelW} height={30} rx={15} fill="#fff" stroke="#1d1d1f" strokeWidth={1.8} />
                  <text x={0} y={size / 2 + 28} fill="#1d1d1f" fontSize={12} fontWeight={800} textAnchor="middle">
                    {label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function BattleSandbox({ battle, onBack }: BattleSandboxProps) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const stateRef = useRef({ time: 0 });
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<keyof typeof PLAYBACK_SPEEDS>("normal");

  const chapter = useMemo(() => {
    return eventWindow(battle, progress);
  }, [battle, progress]);

  const currentEvent = chapter.current;

  useEffect(() => {
    stateRef.current.time = 0;
    setProgress(0);
    setPlaying(false);
    timelineRef.current?.kill();
  }, [battle]);

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  const setSceneTime = (value: number) => {
    const next = Math.round(value * 10) / 10;
    stateRef.current.time = next;
    setProgress(next);
  };

  const animateTo = (target: number, autoPlay = true) => {
    timelineRef.current?.kill();
    const speed = autoPlay ? PLAYBACK_SPEEDS[playbackSpeed].timeUnitsPerSecond : SEEK_TIME_UNITS_PER_SECOND;
    timelineRef.current = gsap.timeline({
      onComplete: () => {
        setPlaying(false);
      }
    });
    timelineRef.current.to(stateRef.current, {
      time: target,
      duration: Math.max(0.25, Math.abs(target - stateRef.current.time) / speed),
      ease: "power1.inOut",
      onUpdate: () => setSceneTime(stateRef.current.time)
    });
    setPlaying(autoPlay);
  };

  const togglePlayback = () => {
    if (playing) {
      timelineRef.current?.pause();
      setPlaying(false);
      return;
    }

    const target = stateRef.current.time >= battle.duration ? 0 : battle.duration;
    animateTo(target);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTyping =
        target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";

      if (isTyping) return;
      event.preventDefault();
      togglePlayback();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playing, battle.duration]);

  const jumpBy = (delta: number) => {
    const next = Math.min(battle.duration, Math.max(0, stateRef.current.time + delta));
    animateTo(next, false);
  };

  const reset = () => {
    animateTo(0, false);
  };

  const scrub = (value: number) => {
    timelineRef.current?.kill();
    setSceneTime(value);
    setPlaying(false);
  };

  const toolbarButtonClass =
    "grid size-10 cursor-pointer place-items-center rounded-full border border-black/8 bg-white/70 text-[#5f6368] shadow-[0_6px_18px_rgba(0,0,0,0.05)] backdrop-blur-md hover:border-black/16 hover:bg-white/95 hover:text-[#1d1d1f]";

  return (
    <main className="grid min-h-screen grid-cols-[minmax(320px,400px)_minmax(0,1fr)] bg-linear-to-b from-[#fbfbfd] to-[#f5f5f7] max-[900px]:grid-cols-1">
      <section
        className="flex min-w-0 flex-col gap-7 border-r border-black/8 bg-white/72 p-[38px] shadow-[16px_0_50px_rgba(0,0,0,0.04)] backdrop-blur-2xl backdrop-saturate-150 max-[900px]:order-2 max-[900px]:border-r-0 max-[900px]:border-t max-[900px]:p-6 max-[560px]:p-[18px]"
        aria-label="战役控制台"
      >
        <button
          className="inline-flex min-h-9 w-fit cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-semibold text-[#5f6368] hover:text-[#1d1d1f]"
          aria-label="返回战役列表"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          <span>战役列表</span>
        </button>

        <div className="title-block">
          <p className="m-0 text-[13px] font-semibold text-[#86868b]">
            {battle.era} / {battle.year}
          </p>
          <h1 className="my-3 text-[clamp(38px,5vw,60px)] leading-none font-bold tracking-normal text-[#1d1d1f]">{battle.name}</h1>
          <span className="m-0 text-[13px] font-semibold text-[#86868b]">{battle.location}</span>
        </div>

        <div className="text-[15px] leading-[1.85] text-[#5f6368]">{battle.briefing}</div>

        <div className="rounded-lg border border-black/8 bg-white/54 p-[22px] shadow-[inset_0_1px_rgba(255,255,255,0.75)]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-bold text-[#0071e3]">T+{Math.round(progress)}</span>
            <span className="text-[12px] font-semibold text-[#86868b]">
              {chapter.index + 1} / {battle.events.length}
            </span>
          </div>
          <h2 className="my-2.5 text-[23px] font-bold tracking-normal text-[#1d1d1f]">{currentEvent.title}</h2>
          <p className="m-0 leading-[1.75] text-[#5f6368]">{currentEvent.detail}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/8">
            <div className="h-full rounded-full bg-[#0071e3]" style={{ width: pct(chapter.progress) }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-black/8 bg-white/50 p-3">
            <div className="text-[20px] font-bold text-[#1d1d1f]">{battle.units.length}</div>
            <div className="mt-1 text-[12px] font-semibold text-[#86868b]">作战单位</div>
          </div>
          <div className="rounded-lg border border-black/8 bg-white/50 p-3">
            <div className="text-[20px] font-bold text-[#1d1d1f]">{battle.events.length}</div>
            <div className="mt-1 text-[12px] font-semibold text-[#86868b]">推演阶段</div>
          </div>
          <div className="rounded-lg border border-black/8 bg-white/50 p-3">
            <div className="text-[20px] font-bold text-[#1d1d1f]">{Math.round(battle.duration / PLAYBACK_SPEEDS[playbackSpeed].timeUnitsPerSecond)}s</div>
            <div className="mt-1 text-[12px] font-semibold text-[#86868b]">播放时长</div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-bold text-[#1d1d1f]">播放速度</span>
            <div className="grid grid-cols-3 rounded-full border border-black/8 bg-white/58 p-1">
              {(Object.keys(PLAYBACK_SPEEDS) as Array<keyof typeof PLAYBACK_SPEEDS>).map((speed) => (
                <button
                  className={`min-h-8 cursor-pointer rounded-full px-3 text-[13px] font-bold transition-colors ${
                    playbackSpeed === speed ? "bg-[#0071e3] text-white" : "text-[#5f6368] hover:bg-black/5"
                  }`}
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  type="button"
                >
                  {PLAYBACK_SPEEDS[speed].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5">
            {battle.events.map((event, index) => (
              <button
                className={`grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_42px] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  index === chapter.index ? "border-[#0071e3]/35 bg-[#0071e3]/8" : "border-black/8 bg-white/45 hover:bg-white/80"
                }`}
                key={event.title}
                onClick={() => animateTo(event.t, false)}
                type="button"
              >
                <span className={`grid size-7 place-items-center rounded-full text-[12px] font-bold ${index <= chapter.index ? "bg-[#0071e3] text-white" : "bg-black/8 text-[#86868b]"}`}>
                  {index + 1}
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-[#1d1d1f]">{event.title}</span>
                <span className="text-right text-[12px] font-semibold text-[#86868b]">T+{event.t}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto grid gap-3.5">
          <div className="text-[13px] font-bold text-[#1d1d1f]">兵力态势</div>
          <div className="grid gap-3.5">
            {battle.units.map((unit) => (
              <div
                className="grid grid-cols-[10px_minmax(0,1fr)_80px] items-center gap-3 text-[13px] text-[#1d1d1f] max-[560px]:grid-cols-[10px_minmax(0,1fr)]"
                key={unit.id}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: unitFill(unit) }} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{unit.name}</span>
                <meter className="h-1.5 w-20 accent-[#0071e3] max-[560px]:col-start-2 max-[560px]:w-full" min={0} max={100} value={unit.strength} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative flex min-w-0 flex-col items-center gap-4 px-[clamp(18px,3vw,40px)] py-8 max-[900px]:order-1 max-[900px]:min-h-[560px] max-[900px]:p-6 max-[560px]:min-h-0 max-[560px]:gap-4 max-[560px]:p-[18px]"
        aria-label="沙盘地图"
      >
        <div className="hidden max-[900px]:block">
          <p className="m-0 text-[12px] font-semibold text-[#86868b]">
            {battle.era} / {battle.year}
          </p>
          <h1 className="mt-2 mb-1 text-[34px] leading-none font-bold tracking-normal text-[#1d1d1f]">{battle.name}</h1>
          <span className="text-[12px] font-semibold text-[#86868b]">{battle.location}</span>
        </div>
        <div className="flex min-h-12 w-full max-w-[1280px] items-center gap-2.5">
          <button className={`${toolbarButtonClass} hidden max-[900px]:grid`} aria-label="返回战役列表" title="战役列表" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <button className={toolbarButtonClass} aria-label="后退" title="后退" onClick={() => jumpBy(-STEP_TIME_UNITS)}>
            <SkipBack size={18} />
          </button>
          <button
            className="grid size-12 cursor-pointer place-items-center rounded-full border border-[#0071e3] bg-[#0071e3] text-white"
            aria-label={playing ? "暂停" : "播放"}
            title={playing ? "暂停" : "播放"}
            onClick={togglePlayback}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className={toolbarButtonClass} aria-label="前进" title="前进" onClick={() => jumpBy(STEP_TIME_UNITS)}>
            <SkipForward size={18} />
          </button>
          <button className={toolbarButtonClass} aria-label="重置" title="重置" onClick={reset}>
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="relative aspect-[10/7] w-full max-w-[1280px] overflow-hidden rounded-lg border border-black/12 bg-[#f4faf6] shadow-[0_18px_46px_rgba(0,0,0,0.07)]">
          <BattleMap battle={battle} time={progress} />
        </div>

        <div className="relative min-h-[88px] w-full max-w-[1280px] pt-2.5 pb-5">
          <input
            className="w-full accent-[#0071e3]"
            aria-label="战役时间轴"
            type="range"
            min={0}
            max={battle.duration}
            value={progress}
            onChange={(event) => scrub(Number(event.target.value))}
          />
          <div className="absolute inset-x-0 top-9 h-3.5">
            {battle.events.map((event) => (
              <button
                key={event.title}
                className={`absolute size-2.5 -translate-x-1/2 cursor-pointer rounded-full border p-0 shadow-[0_3px_10px_rgba(0,0,0,0.08)] ${
                  event.t <= progress ? "border-[#0071e3] bg-[#0071e3]" : "border-[#86868b] bg-white"
                }`}
                style={{ left: `${event.t}%` }}
                onClick={() => animateTo(event.t, false)}
                aria-label={event.title}
                title={event.title}
              />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-[12px] font-semibold text-[#86868b] min-[760px]:grid-cols-6">
            {battle.events.map((event, index) => (
              <button
                className={`cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-md px-2 py-1 text-left ${
                  index === chapter.index ? "bg-[#0071e3]/10 text-[#0071e3]" : "hover:bg-black/5"
                }`}
                key={event.title}
                onClick={() => animateTo(event.t, false)}
                title={event.title}
                type="button"
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
