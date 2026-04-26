"use client";

import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { Battle, sideMeta } from "@/data/battles";

type BattleGalleryProps = {
  battles: Battle[];
  onSelect: (battle: Battle) => void;
};

export default function BattleGallery({ battles, onSelect }: BattleGalleryProps) {
  return (
    <main className="gallery-shell">
      <header className="gallery-header">
        <div>
          <p>古今中外知名战役</p>
          <h1>战役沙盘库</h1>
        </div>
        <span>{battles.length} 个可播放沙盘</span>
      </header>

      <section className="masonry-list" aria-label="战役卡片列表">
        {battles.map((battle, index) => (
          <article className={`battle-card card-${index % 3}`} key={battle.id}>
            <button className="card-button" onClick={() => onSelect(battle)} aria-label={`打开${battle.name}`}>
              <div className={`card-map card-map-${battle.mapTone}`}>
                <div className="card-grid" />
                <span>{battle.coverFocus}</span>
              </div>
              <div className="card-content">
                <div className="card-kicker">
                  <span>{battle.era}</span>
                  <span>{battle.year}</span>
                </div>
                <h2>{battle.name}</h2>
                <p>{battle.briefing}</p>
                <div className="card-meta">
                  <span>
                    <MapPin size={14} />
                    {battle.location}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {battle.events.length} 阶段
                  </span>
                </div>
                <div className="card-forces">
                  {battle.units.slice(0, 4).map((unit) => (
                    <i key={unit.id} style={{ backgroundColor: sideMeta[unit.side].css }} />
                  ))}
                </div>
              </div>
              <div className="card-open">
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
