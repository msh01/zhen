"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Battle, BattleUnit, sideMeta } from "@/data/battles";

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

  const nextIndex = path.findIndex((point) => point.t >= time);
  const previous = path[nextIndex - 1];
  const next = path[nextIndex];
  const span = next.t - previous.t || 1;
  const mix = gsap.parseEase("power1.inOut")((time - previous.t) / span);

  return {
    x: previous.x + (next.x - previous.x) * mix,
    y: previous.y + (next.y - previous.y) * mix,
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
  const travelled = unit.path.filter((point) => point.t <= time);
  return travelled.length ? [...travelled, current] : [unit.path[0], current];
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={7} strokeLinecap="round" />
      <polygon points={`${p1} ${p2} ${p3}`} fill={color} />
    </g>
  );
}

function Badge({ label, x, y, color, opacity }: { label: string; x: number; y: number; color: string; opacity: number }) {
  const width = label.length * 14 + 24;
  return (
    <g transform={`translate(${sx(x)} ${sy(y)})`} opacity={opacity}>
      <rect x={-10} y={-20} width={width} height={32} rx={7} fill={color} />
      <text x={2} y={2} fill="#fff" fontSize={16} fontWeight={700}>
        {label}
      </text>
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
        strokeWidth={2 + encircle * 7}
        opacity={encircle * 0.45 * pulse}
      />
      <ellipse
        cx={sx(55)}
        cy={sy(50)}
        rx={sx(9 + encircle * 6)}
        ry={sy(7 + encircle * 4)}
        fill="#f06b57"
        opacity={encircle * 0.08}
      />

      <line
        x1={sx(73)}
        y1={sy(76)}
        x2={sx(53)}
        y2={sy(53)}
        stroke="#2d8f57"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="18 18"
        opacity={Math.max(0.18, 0.78 - cutSupply * 0.72)}
      />
      <g opacity={cutSupply}>
        <line x1={sx(61) - 16} y1={sy(62) - 16} x2={sx(61) + 16} y2={sy(62) + 16} stroke="#c02828" strokeWidth={8} strokeLinecap="round" />
        <line x1={sx(61) + 16} y1={sy(62) - 16} x2={sx(61) - 16} y2={sy(62) + 16} stroke="#c02828" strokeWidth={8} strokeLinecap="round" />
      </g>

      <Arrow from={{ x: 32, y: 42 }} to={{ x: 47, y: 48 }} color="#f06b57" opacity={0.18 + lure * 0.48} />
      <Arrow from={{ x: 42, y: 25 }} to={{ x: 66, y: 42 }} color="#e3b341" opacity={0.18 + wing * 0.58} />
      <Arrow from={{ x: 39, y: 71 }} to={{ x: 66, y: 55 }} color="#e3b341" opacity={0.18 + wing * 0.58} />
      <Arrow from={{ x: 75, y: 48 }} to={{ x: 55, y: 50 }} color="#5fb4ff" opacity={0.22 + lure * 0.44} />

      {lure > 0.04 && <Badge label="诱敌出垒" x={44} y={38} color="#f06b57" opacity={lure} />}
      {wing > 0.04 && <Badge label="侧后穿插" x={66} y={37} color="#e3b341" opacity={wing} />}
      {cutSupply > 0.04 && <Badge label="粮道切断" x={62} y={65} color="#c02828" opacity={cutSupply} />}
      {encircle > 0.04 && <Badge label="包围压缩" x={47} y={58} color="#f06b57" opacity={encircle} />}
    </g>
  );
}

function BattleMap({ battle, time }: { battle: Battle; time: number }) {
  const colors = terrainColors(battle.mapTone);
  const chapter = eventWindow(battle, time);
  const gridColumns = Array.from({ length: 13 }, (_, index) => (index / 12) * VIEWBOX_WIDTH);
  const gridRows = Array.from({ length: 9 }, (_, index) => (index / 8) * VIEWBOX_HEIGHT);
  const contours = Array.from({ length: 11 }, (_, index) => {
    const y = VIEWBOX_HEIGHT * (0.12 + index * 0.075);
    const points = Array.from({ length: 29 }, (_, xIndex) => {
      const x = VIEWBOX_WIDTH * 0.05 + xIndex * ((VIEWBOX_WIDTH * 0.9) / 28);
      return `${x},${y + Math.sin(x * 0.017 + index * 0.8) * 9}`;
    });
    return `M ${points.join(" L ")}`;
  });

  return (
    <svg
      className="block size-full"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={`${battle.name} SVG 沙盘动画`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={colors.base} />
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#fff" opacity={0.14} />
      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="none" stroke="#675d48" strokeWidth={2} opacity={0.22} />

      <g opacity={0.22}>
        {gridColumns.map((x) => (
          <line key={`x-${x}`} x1={x} y1={0} x2={x} y2={VIEWBOX_HEIGHT} stroke={colors.grid} strokeWidth={1} />
        ))}
        {gridRows.map((y) => (
          <line key={`y-${y}`} x1={0} y1={y} x2={VIEWBOX_WIDTH} y2={y} stroke={colors.grid} strokeWidth={1} />
        ))}
      </g>

      <g opacity={0.16}>
        {contours.map((d, index) => (
          <path key={index} d={d} fill="none" stroke={colors.contour} strokeWidth={1.5} />
        ))}
      </g>

      <g aria-label="地形">
        {battle.terrain.map((feature, index) => {
          if (feature.type === "river") {
            return (
              <g key={index}>
                <path d={pathD(feature.points)} fill="none" stroke="#247ec2" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.62} />
                <path d={pathD(feature.points)} fill="none" stroke="#dff4ff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
              </g>
            );
          }

          if (feature.type === "ridge") {
            return (
              <g key={index}>
                <path d={pathD(feature.points)} fill="none" stroke="#8b7448" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
                <path d={pathD(feature.points)} fill="none" stroke="#5b4b30" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} />
              </g>
            );
          }

          if (feature.type === "road") {
            return <path key={index} d={pathD(feature.points)} fill="none" stroke="#6e6353" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.42} />;
          }

          if (feature.type === "coast") {
            return <polygon key={index} points={polygonPoints(feature.points)} fill="#f4ecd8" opacity={0.86} />;
          }

          const point = feature.points[0];
          return <rect key={index} x={sx(point.x) - 13} y={sy(point.y) - 13} width={26} height={26} rx={4} fill="#fff" stroke="#5d5547" opacity={0.9} />;
        })}
      </g>

      <g aria-label="地名">
        {battle.terrain.map((feature, index) => {
          if (!feature.label) return null;
          const anchor = terrainAnchor(feature.points);
          return (
            <text key={index} x={sx(anchor.x) + 12} y={sy(anchor.y) - 14} fill="#1d1d1f" fontSize={16} fontWeight={700} opacity={0.68}>
              {feature.label}
            </text>
          );
        })}
      </g>

      <g aria-label="战线" opacity={0.24}>
        {battle.fronts.map((front, index) => (
          <path key={index} d={pathD(front)} fill="none" stroke="#1d1d1f" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>

      {battle.id === "changping" && <ChangpingDynamics time={time} />}

      <g aria-label="部队轨迹">
        {battle.units.map((unit) => {
          const visible = time + 14 >= unit.path[0].t;
          const points = trailPoints(unit, time);
          return (
            <path
              key={unit.id}
              d={pathD(points)}
              fill="none"
              stroke={sideMeta[unit.side].css}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={visible ? 0.5 : 0.12}
            />
          );
        })}
      </g>

      <g aria-label="部队">
        {battle.units.map((unit) => {
          const position = interpolatePath(unit, time);
          const visible = time + 14 >= unit.path[0].t;
          const size = 30 + unit.strength * 0.18;
          const label = `${UNIT_SYMBOL[unit.kind]} ${mapUnitName(unit.name)}`;
          const labelToLeft = position.x > 58 || unit.side === "blue";
          const labelX = labelToLeft ? -size / 2 - 8 : size / 2 + 8;
          const textAnchor = labelToLeft ? "end" : "start";

          return (
            <g key={unit.id} transform={`translate(${sx(position.x)} ${sy(position.y)})`} opacity={visible ? 1 : 0.12}>
              <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={8} fill={sideMeta[unit.side].css} stroke="#fff" strokeWidth={4} />
              <circle r={7} fill="#111" opacity={0.25} />
              <text
                className="hidden min-[520px]:block"
                x={labelX}
                y={5}
                fill="#1d1d1f"
                fontSize={15}
                fontWeight={700}
                textAnchor={textAnchor}
                paintOrder="stroke"
                stroke="#f7f3e9"
                strokeWidth={4}
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>

      <g aria-label="当前阶段" transform="translate(34 42)">
        <rect width={250} height={68} rx={10} fill="#fffaf0" opacity={0.88} stroke="#1d1d1f" strokeOpacity={0.08} />
        <text x={18} y={28} fill="#0071e3" fontSize={16} fontWeight={800}>
          T+{Math.round(time)}
        </text>
        <text x={18} y={54} fill="#1d1d1f" fontSize={22} fontWeight={800}>
          {chapter.current.title}
        </text>
        <rect x={148} y={23} width={78} height={5} rx={3} fill="#d6d0c0" opacity={0.8} />
        <rect x={148} y={23} width={78 * chapter.progress} height={5} rx={3} fill="#0071e3" />
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
                <span className="size-2 rounded-full" style={{ backgroundColor: sideMeta[unit.side].css }} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{unit.name}</span>
                <meter className="h-1.5 w-20 accent-[#0071e3] max-[560px]:col-start-2 max-[560px]:w-full" min={0} max={100} value={unit.strength} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative grid min-w-0 grid-rows-[auto_auto_minmax(300px,1fr)_auto] gap-5 p-[38px] max-[900px]:order-1 max-[900px]:min-h-[560px] max-[900px]:p-6 max-[560px]:min-h-0 max-[560px]:grid-rows-[auto_auto_auto_auto] max-[560px]:gap-4 max-[560px]:p-[18px]"
        aria-label="沙盘地图"
      >
        <div className="hidden max-[900px]:block">
          <p className="m-0 text-[12px] font-semibold text-[#86868b]">
            {battle.era} / {battle.year}
          </p>
          <h1 className="mt-2 mb-1 text-[34px] leading-none font-bold tracking-normal text-[#1d1d1f]">{battle.name}</h1>
          <span className="text-[12px] font-semibold text-[#86868b]">{battle.location}</span>
        </div>
        <div className="flex min-h-12 items-center gap-2.5">
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

        <div className="relative aspect-[10/7] min-h-[320px] overflow-hidden rounded-lg border border-black/16 bg-[#e7ece7] shadow-[0_22px_60px_rgba(0,0,0,0.08)] max-[560px]:min-h-0">
          <BattleMap battle={battle} time={progress} />
        </div>

        <div className="relative min-h-[88px] pt-2.5 pb-5">
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
