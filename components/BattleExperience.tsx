"use client";

import { useState } from "react";
import BattleGallery from "@/components/BattleGallery";
import BattleSandbox from "@/components/BattleSandbox";
import { Battle, battles } from "@/data/battles";

export default function BattleExperience() {
  const [selectedBattle, setSelectedBattle] = useState<Battle | null>(null);

  if (selectedBattle) {
    return <BattleSandbox battle={selectedBattle} onBack={() => setSelectedBattle(null)} />;
  }

  return <BattleGallery battles={battles} onSelect={setSelectedBattle} />;
}
