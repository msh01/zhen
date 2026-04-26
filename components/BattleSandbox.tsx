"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Battle, BattleUnit, sideMeta } from "@/data/battles";

type BattleSandboxProps = {
  battle: Battle;
  onBack: () => void;
};

type UnitSprite = {
  unit: BattleUnit;
  group: Container;
  body: Graphics;
  label: Text;
  trail: Graphics;
};

const UNIT_SYMBOL: Record<BattleUnit["kind"], string> = {
  infantry: "步",
  cavalry: "骑",
  armor: "装",
  naval: "舰",
  air: "空"
};

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
  const mix = (time - previous.t) / span;

  return {
    x: previous.x + (next.x - previous.x) * mix,
    y: previous.y + (next.y - previous.y) * mix,
    t: time
  };
}

function pctX(x: number, width: number) {
  return (x / 100) * width;
}

function pctY(y: number, height: number) {
  return (y / 100) * height;
}

function drawPolyline(graphics: Graphics, points: Array<{ x: number; y: number }>, width: number, height: number) {
  if (!points.length) return;
  graphics.moveTo(pctX(points[0].x, width), pctY(points[0].y, height));
  for (const point of points.slice(1)) {
    graphics.lineTo(pctX(point.x, width), pctY(point.y, height));
  }
}

function terrainColors(tone: Battle["mapTone"]) {
  switch (tone) {
    case "island":
      return { base: 0x183b4a, grid: 0x2c6575, contour: 0x60a2a5 };
    case "europe":
      return { base: 0x273b2f, grid: 0x4d644e, contour: 0x8a9a70 };
    case "coast":
      return { base: 0x1f4140, grid: 0x4a7471, contour: 0x8fb8aa };
    default:
      return { base: 0x393724, grid: 0x625f3d, contour: 0x9c8d52 };
  }
}

function drawSandbox(
  app: Application,
  battle: Battle,
  time: number,
  spritesRef: React.MutableRefObject<UnitSprite[]>
) {
  const width = app.renderer.width;
  const height = app.renderer.height;
  const stage = app.stage;
  stage.removeChildren();
  spritesRef.current = [];

  const colors = terrainColors(battle.mapTone);
  const map = new Graphics();
  map.rect(0, 0, width, height).fill({ color: colors.base });

  for (let x = 0; x <= width; x += width / 12) {
    map.moveTo(x, 0).lineTo(x, height).stroke({ color: colors.grid, width: 1, alpha: 0.22 });
  }
  for (let y = 0; y <= height; y += height / 8) {
    map.moveTo(0, y).lineTo(width, y).stroke({ color: colors.grid, width: 1, alpha: 0.22 });
  }
  for (let i = 0; i < 8; i += 1) {
    const y = height * (0.17 + i * 0.09);
    map.moveTo(width * 0.06, y);
    for (let x = width * 0.06; x <= width * 0.94; x += 40) {
      map.lineTo(x, y + Math.sin(x * 0.018 + i) * 11);
    }
    map.stroke({ color: colors.contour, width: 1, alpha: 0.18 });
  }
  stage.addChild(map);

  const terrainLayer = new Graphics();
  for (const feature of battle.terrain) {
    if (feature.type === "river") {
      drawPolyline(terrainLayer, feature.points, width, height);
      terrainLayer.stroke({ color: 0x6db7d9, width: 5, alpha: 0.8 });
    }
    if (feature.type === "ridge") {
      drawPolyline(terrainLayer, feature.points, width, height);
      terrainLayer.stroke({ color: 0xc0a365, width: 7, alpha: 0.52 });
    }
    if (feature.type === "road") {
      drawPolyline(terrainLayer, feature.points, width, height);
      terrainLayer.stroke({ color: 0xd3c083, width: 2, alpha: 0.5 });
    }
    if (feature.type === "coast") {
      terrainLayer
        .poly(feature.points.flatMap((point) => [pctX(point.x, width), pctY(point.y, height)]))
        .fill({ color: 0xb4ad79, alpha: 0.92 });
    }
    if (feature.type === "city") {
      const point = feature.points[0];
      terrainLayer
        .roundRect(pctX(point.x, width) - 10, pctY(point.y, height) - 10, 20, 20, 3)
        .fill({ color: 0xe8d8a6, alpha: 0.9 });
    }
  }
  stage.addChild(terrainLayer);

  for (const feature of battle.terrain) {
    if (!feature.label) continue;
    const anchor = feature.points[Math.floor(feature.points.length / 2)];
    const text = new Text({
      text: feature.label,
      style: new TextStyle({
        fill: 0xe7e0c7,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12
      })
    });
    text.alpha = 0.72;
    text.position.set(pctX(anchor.x, width) + 10, pctY(anchor.y, height) - 18);
    stage.addChild(text);
  }

  const frontLayer = new Graphics();
  for (const front of battle.fronts) {
    drawPolyline(frontLayer, front, width, height);
    frontLayer.stroke({ color: 0xf2ead2, width: 2, alpha: 0.4 });
  }
  stage.addChild(frontLayer);

  const unitsLayer = new Container();
  stage.addChild(unitsLayer);

  for (const unit of battle.units) {
    const meta = sideMeta[unit.side];
    const group = new Container();
    const trail = new Graphics();
    const body = new Graphics();
    const label = new Text({
      text: `${UNIT_SYMBOL[unit.kind]} ${unit.name}`,
      style: new TextStyle({
        fill: 0xf9f6eb,
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        fontWeight: "600"
      })
    });

    body
      .roundRect(-15, -15, 30, 30, 6)
      .fill({ color: meta.color })
      .stroke({ color: 0xfaf7ea, width: 2, alpha: 0.72 });
    body.circle(0, 0, 5).fill({ color: 0x111111, alpha: 0.25 });
    label.position.set(18, -10);
    group.addChild(trail, body, label);
    unitsLayer.addChild(group);
    spritesRef.current.push({ unit, group, body, label, trail });
  }

  updateUnits(app, time, spritesRef.current);
}

function updateUnits(app: Application, time: number, sprites: UnitSprite[]) {
  const width = app.renderer.width;
  const height = app.renderer.height;

  for (const sprite of sprites) {
    const { unit, group, trail, body } = sprite;
    const position = interpolatePath(unit, time);
    group.position.set(pctX(position.x, width), pctY(position.y, height));
    group.alpha = time + 18 >= unit.path[0].t ? 1 : 0.18;
    body.scale.set(0.78 + unit.strength / 210);

    trail.clear();
    const travelled = unit.path.filter((point) => point.t <= time);
    const current = { x: position.x, y: position.y };
    const trailPoints = travelled.length ? [...travelled, current] : [unit.path[0], current];
    if (trailPoints.length > 1) {
      trail.moveTo(pctX(trailPoints[0].x, width) - group.x, pctY(trailPoints[0].y, height) - group.y);
      for (const point of trailPoints.slice(1)) {
        trail.lineTo(pctX(point.x, width) - group.x, pctY(point.y, height) - group.y);
      }
      trail.stroke({ color: sideMeta[unit.side].color, width: 3, alpha: 0.52 });
    }
  }
}

export default function BattleSandbox({ battle, onBack }: BattleSandboxProps) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const spritesRef = useRef<UnitSprite[]>([]);
  const timelineRef = useRef<gsap.core.Tween | null>(null);
  const stateRef = useRef({ time: 0 });
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  const currentEvent = useMemo(() => {
    return [...battle.events].reverse().find((event) => event.t <= progress) ?? battle.events[0];
  }, [battle, progress]);

  useEffect(() => {
    let disposed = false;
    const host = canvasHostRef.current;
    if (!host) return;
    const hostElement = host;

    const app = new Application();

    async function init() {
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: hostElement,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      if (disposed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      hostElement.appendChild(app.canvas);
      drawSandbox(app, battle, stateRef.current.time, spritesRef);
    }

    init();

    const handleResize = () => {
      if (!appRef.current) return;
      drawSandbox(appRef.current, battle, stateRef.current.time, spritesRef);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      timelineRef.current?.kill();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    stateRef.current.time = 0;
    setProgress(0);
    setPlaying(false);
    timelineRef.current?.kill();
    if (appRef.current) {
      drawSandbox(appRef.current, battle, 0, spritesRef);
    }
  }, [battle]);

  useEffect(() => {
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  const animateTo = (target: number, autoPlay = true) => {
    timelineRef.current?.kill();
    timelineRef.current = gsap.to(stateRef.current, {
      time: target,
      duration: Math.max(0.25, Math.abs(target - stateRef.current.time) / 18),
      ease: "power1.inOut",
      onUpdate: () => {
        const next = Math.round(stateRef.current.time * 10) / 10;
        setProgress(next);
        if (appRef.current) updateUnits(appRef.current, next, spritesRef.current);
      },
      onComplete: () => {
        setPlaying(false);
      }
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

  const jumpBy = (delta: number) => {
    const next = Math.min(battle.duration, Math.max(0, stateRef.current.time + delta));
    animateTo(next, false);
  };

  const reset = () => {
    animateTo(0, false);
  };

  const scrub = (value: number) => {
    timelineRef.current?.kill();
    stateRef.current.time = value;
    setProgress(value);
    setPlaying(false);
    if (appRef.current) updateUnits(appRef.current, value, spritesRef.current);
  };

  return (
    <main className="sandbox-shell">
      <section className="command-panel" aria-label="战役控制台">
        <button className="back-button" aria-label="返回战役列表" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>战役列表</span>
        </button>

        <div className="title-block">
          <p>
            {battle.era} · {battle.year}
          </p>
          <h1>{battle.name}</h1>
          <span>{battle.location}</span>
        </div>

        <div className="briefing">{battle.briefing}</div>

        <div className="event-board">
          <span className="event-time">T+{Math.round(progress)}</span>
          <h2>{currentEvent.title}</h2>
          <p>{currentEvent.detail}</p>
        </div>

        <div className="force-list">
          {battle.units.map((unit) => (
            <div className="force-row" key={unit.id}>
              <span className="force-dot" style={{ backgroundColor: sideMeta[unit.side].css }} />
              <span>{unit.name}</span>
              <meter min={0} max={100} value={unit.strength} />
            </div>
          ))}
        </div>
      </section>

      <section className="map-panel" aria-label="沙盘地图">
        <div className="map-toolbar">
          <button aria-label="后退" onClick={() => jumpBy(-12)}>
            <SkipBack size={18} />
          </button>
          <button className="primary-control" aria-label={playing ? "暂停" : "播放"} onClick={togglePlayback}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button aria-label="前进" onClick={() => jumpBy(12)}>
            <SkipForward size={18} />
          </button>
          <button aria-label="重置" onClick={reset}>
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="canvas-frame" ref={canvasHostRef} />

        <div className="timeline-strip">
          <input
            aria-label="战役时间轴"
            type="range"
            min={0}
            max={battle.duration}
            value={progress}
            onChange={(event) => scrub(Number(event.target.value))}
          />
          <div className="phase-markers">
            {battle.events.map((event) => (
              <button
                key={event.title}
                className={event.t <= progress ? "active" : ""}
                style={{ left: `${event.t}%` }}
                onClick={() => animateTo(event.t, false)}
                aria-label={event.title}
                title={event.title}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
