"use client";

import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { Battle, sideMeta } from "@/data/battles";

type BattleGalleryProps = {
  battles: Battle[];
  onSelect: (battle: Battle) => void;
};

const mapToneClass: Record<Battle["mapTone"], string> = {
  coast: "bg-linear-135 from-[#d8ece8] to-[#a9c7c1]",
  europe: "bg-linear-135 from-[#dfe8df] to-[#b8c9bd]",
  island: "bg-linear-135 from-[#d7edf4] to-[#a8c9d8]",
  steppe: "bg-linear-135 from-[#e6dfd0] to-[#c9c0a7]"
};

export default function BattleGallery({ battles, onSelect }: BattleGalleryProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.92),transparent_36%),linear-gradient(180deg,#fbfbfd_0%,#f5f5f7_48%,#ededf0_100%)] px-[clamp(18px,5vw,72px)] pt-16 pb-20 max-[560px]:px-4 max-[560px]:pt-[34px] max-[560px]:pb-[42px]">
      <header className="mx-auto mb-[46px] flex max-w-[1240px] items-end justify-between gap-7 border-b border-black/8 pb-[30px] max-[900px]:flex-col max-[900px]:items-start">
        <div>
          <p className="mb-3.5 text-[13px] font-semibold text-[#86868b]">古今中外知名战役</p>
          <h1 className="m-0 max-w-[760px] text-[clamp(46px,7vw,92px)] leading-[0.96] font-bold tracking-normal text-[#1d1d1f]">
            战役沙盘库
          </h1>
        </div>
        <span className="text-sm whitespace-nowrap text-[#86868b]">{battles.length} 个可播放沙盘</span>
      </header>

      <section className="mx-auto max-w-[1240px] columns-3 gap-6 max-[900px]:columns-2 max-[560px]:columns-1" aria-label="战役卡片列表">
        {battles.map((battle, index) => (
          <article
            className="mb-6 inline-block w-full break-inside-avoid overflow-hidden rounded-lg border border-black/8 bg-white/78 shadow-[0_10px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 transition-[background,border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-black/16 hover:bg-white/92 hover:shadow-[0_22px_60px_rgba(0,0,0,0.08)]"
            key={battle.id}
          >
            <button
              className="grid min-h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left text-inherit focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#0071e31f]"
              onClick={() => onSelect(battle)}
              aria-label={`打开${battle.name}`}
            >
              <div
                className={`relative grid min-h-[150px] place-items-center overflow-hidden border-b border-black/8 before:absolute before:h-px before:w-3/4 before:-rotate-12 before:bg-black/18 after:absolute after:h-px after:w-[44%] after:rotate-[24deg] after:bg-[#0071e3]/50 ${index % 3 === 1 ? "min-h-[216px]" : ""} ${index % 3 === 2 ? "min-h-[184px]" : ""} ${mapToneClass[battle.mapTone]}`}
              >
                <div className="absolute inset-0 opacity-[0.34] [background-image:linear-gradient(rgba(29,29,31,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(29,29,31,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
                <span className="relative z-10 grid size-[86px] place-items-center rounded-full border border-white/80 bg-white/58 text-[15px] font-bold text-[#1d1d1f] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04),0_16px_34px_rgba(0,0,0,0.09)] backdrop-blur-lg">
                  {battle.coverFocus}
                </span>
              </div>
              <div className="grid gap-3.5 p-6">
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#86868b]">
                  <span className="text-[#0071e3]">{battle.era}</span>
                  <span>{battle.year}</span>
                </div>
                <h2 className="m-0 text-[26px] leading-[1.12] font-bold tracking-normal text-[#1d1d1f]">{battle.name}</h2>
                <p className="m-0 text-sm leading-[1.75] text-[#5f6368]">{battle.briefing}</p>
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#86868b]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {battle.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {battle.events.length} 阶段
                  </span>
                </div>
                <div className="flex gap-2">
                  {battle.units.slice(0, 4).map((unit) => (
                    <i className="h-[3px] w-[34px] rounded-full" key={unit.id} style={{ backgroundColor: sideMeta[unit.side].css }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-black/8 px-6 py-[15px] text-sm font-semibold text-[#0071e3]">
                <span>进入沙盘</span>
                <ArrowRight size={17} />
              </div>
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
