import changping from "./battles/changping/battle.json";
import midway from "./battles/midway/battle.json";
import waterloo from "./battles/waterloo/battle.json";

export type SideId = "blue" | "red" | "gold" | "green";

export type BattleUnit = {
  id: string;
  name: string;
  side: SideId;
  kind: "infantry" | "cavalry" | "armor" | "naval" | "air";
  strength: number;
  path: Array<{ x: number; y: number; t: number }>;
};

export type BattleEvent = {
  t: number;
  title: string;
  detail: string;
};

export type Battle = {
  id: string;
  name: string;
  era: string;
  year: string;
  location: string;
  mapTone: "steppe" | "coast" | "europe" | "island";
  duration: number;
  coverFocus: string;
  briefing: string;
  fronts: Array<Array<{ x: number; y: number }>>;
  terrain: Array<{
    type: "river" | "ridge" | "road" | "coast" | "city";
    label?: string;
    points: Array<{ x: number; y: number }>;
  }>;
  units: BattleUnit[];
  events: BattleEvent[];
};

export const sideMeta: Record<SideId, { label: string; color: number; css: string }> = {
  blue: { label: "联军/守方", color: 0x5fb4ff, css: "#5fb4ff" },
  red: { label: "进攻方", color: 0xf06b57, css: "#f06b57" },
  gold: { label: "机动军团", color: 0xe3b341, css: "#e3b341" },
  green: { label: "侧翼/预备队", color: 0x71bf6a, css: "#71bf6a" }
};

export const battles: Battle[] = [changping, waterloo, midway] as Battle[];
