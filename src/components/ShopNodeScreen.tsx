import { useState } from 'react';
import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import {
  equipWeaponOnRunPlayer,
  getMaxWeaponLevel,
  getSellValue,
  getShopItemPrice,
  getUpgradeById,
  installUpgradeOnRunPlayer,
  rankUpWeaponOnRunPlayer,
  rollPostBattleDraftChoices,
} from '../logic/upgradeLogic';
import type {
  DraftChoice,
  MetaProgressState,
  RunNodeData,
  RunPlayerState,
} from '../logic/types';
import { AmbientBackdrop } from './AmbientBackdrop';
import { WeaponSwapModal } from './WeaponSwapModal';

interface ShopNodeScreenProps {
  node: RunNodeData;
  runPlayer: RunPlayerState;
  meta: MetaProgressState;
  onLeaveShop: (updatedPlayer: RunPlayerState) => void;
}

interface ShopListing {
  id: string;
  choice: DraftChoice;
  price: number;
  sold: boolean;
}

function buildListings(
  player: RunPlayerState,
  stage: 1 | 2 | 3
): ShopListing[] {
  const def = getUnitDefById(player.unitDefId);
  const mechaId = def?.mecha.id ?? 'giga_rex';
  const raw = rollPostBattleDraftChoices(player, mechaId, stage, 4, false);
  return raw.map((choice, idx) => ({
    id: `shop-${idx}-${choice.kind}-${
      choice.kind === 'upgrade' ? choice.card.id : choice.weapon.id
    }`,
    choice,
    price: getShopItemPrice(choice),
    sold: false,
  }));
}

export function ShopNodeScreen({
  node,
  runPlayer,
  meta,
  onLeaveShop,
}: ShopNodeScreenProps) {
  const stage = (node.stage ?? 1) as 1 | 2 | 3;
  const [playerState, setPlayerState] = useState<RunPlayerState>(runPlayer);
  const [listings, setListings] = useState<ShopListing[]>(() =>
    buildListings(runPlayer, stage)
  );
  const [rerollCount, setRerollCount] = useState(0);
  const [pendingSwapChoice, setPendingSwapChoice] = useState<{
    listingId: string;
    price: number;
    choice: Extract<DraftChoice, { kind: 'weapon' }>;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>(
    'ยินดีต้อนรับสู่คลังอาวุธสนาม — เลือกซื้อการ์ด, ตีบวกอาวุธ, ซ่อมแซม หรือขายของเก่า'
  );

  const effectiveMecha = getEffectivePlayerMecha(playerState, meta);
  const effectiveMaxSp = getEffectivePlayerMaxSp(playerState, meta);
  const { shopPrices } = combatConfig.economy;
  const rerollCost = shopPrices.baseReroll + rerollCount * shopPrices.rerollIncrement;
  const maxWeaponLv = getMaxWeaponLevel(playerState);

  const handleBuyListing = (listing: ShopListing) => {
    if (listing.sold || playerState.credits < listing.price) return;

    if (listing.choice.kind === 'upgrade') {
      const nextPlayer = installUpgradeOnRunPlayer(
        { ...playerState, credits: playerState.credits - listing.price },
        listing.choice.card
      );
      setPlayerState(nextPlayer);
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, sold: true } : l))
      );
      setStatusMsg(
        `✅ ซื้อและติดตั้ง ${listing.choice.card.name} สำเร็จ (-${listing.price} Cr)`
      );
      return;
    }

    if (listing.choice.kind === 'weapon_rankup') {
      const nextPlayer = rankUpWeaponOnRunPlayer(
        { ...playerState, credits: playerState.credits - listing.price },
        listing.choice.weapon.id
      );
      setPlayerState(nextPlayer);
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, sold: true } : l))
      );
      setStatusMsg(
        `🔨 ตีบวก ${listing.choice.weapon.name} เป็น Lv.${listing.choice.nextLevel} สำเร็จ (-${listing.price} Cr)`
      );
      return;
    }

    // New Weapon
    if (
      playerState.equippedWeapons.length >= combatConfig.weapons.maxSlots
    ) {
      setPendingSwapChoice({
        listingId: listing.id,
        price: listing.price,
        choice: listing.choice,
      });
      return;
    }

    const nextPlayer = equipWeaponOnRunPlayer(
      { ...playerState, credits: playerState.credits - listing.price },
      listing.choice.weapon
    );
    setPlayerState(nextPlayer);
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, sold: true } : l))
    );
    setStatusMsg(
      `⚔️ ติดตั้งอาวุธใหม่ ${listing.choice.weapon.name} สำเร็จ (-${listing.price} Cr)`
    );
  };

  const handleConfirmShopSwap = (replaceWeaponId: string) => {
    if (!pendingSwapChoice) return;
    const { listingId, price, choice } = pendingSwapChoice;
    const nextPlayer = equipWeaponOnRunPlayer(
      { ...playerState, credits: playerState.credits - price },
      choice.weapon,
      replaceWeaponId
    );
    setPlayerState(nextPlayer);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, sold: true } : l))
    );
    setPendingSwapChoice(null);
    setStatusMsg(`⚔️ สลับติดตั้ง ${choice.weapon.name} สำเร็จ (-${price} Cr)`);
  };

  const handleReroll = () => {
    if (playerState.credits < rerollCost) return;
    const updatedPlayer: RunPlayerState = {
      ...playerState,
      credits: playerState.credits - rerollCost,
    };
    setPlayerState(updatedPlayer);
    setRerollCount((c) => c + 1);
    setListings(buildListings(updatedPlayer, stage));
    setStatusMsg(`🔄 สุ่มสินค้าชุดใหม่เรียบร้อย (-${rerollCost} Cr)`);
  };

  const handleForgeWeapon = (weaponId: string) => {
    if (playerState.credits < shopPrices.forgeRankUp) return;
    const w = playerState.equippedWeapons.find((x) => x.id === weaponId);
    if (!w || (w.level ?? 1) >= maxWeaponLv) return;

    const upgraded = rankUpWeaponOnRunPlayer(
      { ...playerState, credits: playerState.credits - shopPrices.forgeRankUp },
      weaponId
    );
    setPlayerState(upgraded);
    setStatusMsg(
      `🔨 Forge Rank-Up: อัปเกรด ${w.name} เป็น Lv.${(w.level ?? 1) + 1} (-${shopPrices.forgeRankUp} Cr)`
    );
  };

  const handleFieldRepair = () => {
    if (playerState.credits < shopPrices.fieldRepair) return;
    const hpHeal = Math.round(
      (effectiveMecha.maxHp * shopPrices.fieldRepairPercent) / 100
    );
    const enHeal = Math.round(
      (effectiveMecha.maxEn * shopPrices.fieldRepairPercent) / 100
    );
    const nextHp = Math.min(effectiveMecha.maxHp, playerState.hp + hpHeal);
    const nextEn = Math.min(effectiveMecha.maxEn, playerState.en + enHeal);
    setPlayerState((prev) => ({
      ...prev,
      credits: prev.credits - shopPrices.fieldRepair,
      hp: nextHp,
      en: nextEn,
    }));
    setStatusMsg(
      `🔧 Field Repair สำเร็จ (+${shopPrices.fieldRepairPercent}% HP/EN · -${shopPrices.fieldRepair} Cr)`
    );
  };

  const handleWingmanUpgrade = (kind: 'heal' | 'armor') => {
    if (playerState.credits < shopPrices.wingmanUpgrade) return;
    setPlayerState((prev) => ({
      ...prev,
      credits: prev.credits - shopPrices.wingmanUpgrade,
      wingmanHealBonus:
        kind === 'heal' ? (prev.wingmanHealBonus ?? 0) + 15 : prev.wingmanHealBonus,
      wingmanArmorBonus:
        kind === 'armor'
          ? (prev.wingmanArmorBonus ?? 0) + 150
          : prev.wingmanArmorBonus,
    }));
    setStatusMsg(
      kind === 'heal'
        ? `🩺 อัปเกรด Aegis-Medic: พลังซ่อม +15% (-${shopPrices.wingmanUpgrade} Cr)`
        : `🛡️ อัปเกรด Wingman Plating: เกราะลูกทีมทั้งหมด +150 (-${shopPrices.wingmanUpgrade} Cr)`
    );
  };

  const handleSellWeapon = (weaponId: string) => {
    if (playerState.equippedWeapons.length <= 1) return;
    const refund = getSellValue(shopPrices.rare);
    const target = playerState.equippedWeapons.find((w) => w.id === weaponId);
    setPlayerState((prev) => ({
      ...prev,
      credits: prev.credits + refund,
      equippedWeapons: prev.equippedWeapons.filter((w) => w.id !== weaponId),
    }));
    setStatusMsg(`💰 ขายอาวุธ ${target?.name ?? ''} ได้รับ +${refund} Cr`);
  };

  const handleSellUpgrade = (index: number) => {
    const upgradeId = playerState.installedUpgradeIds[index];
    const card = getUpgradeById(upgradeId);
    const refund = getSellValue(
      card?.category === 'tactical_chips' ? shopPrices.legendary : shopPrices.rare
    );
    setPlayerState((prev) => {
      const nextIds = [...prev.installedUpgradeIds];
      nextIds.splice(index, 1);
      return {
        ...prev,
        credits: prev.credits + refund,
        installedUpgradeIds: nextIds,
      };
    });
    setStatusMsg(`💰 ถอดขาย ${card?.name ?? upgradeId} ได้รับ +${refund} Cr`);
  };

  return (
    <div
      className="relative min-h-screen bg-[#080c14] px-6 py-8 text-slate-100"
      data-testid="shop-node-screen"
    >
      <AmbientBackdrop />
      <div className="relative z-10 mx-auto max-w-5xl space-y-6">
        {/* Top Header */}
        <div className="hud-panel flex flex-wrap items-center justify-between gap-4 p-5 backdrop-blur-md">
          <div>
            <p className="font-orbitron text-[10px] font-bold tracking-[0.24em] text-[#ffb800] uppercase">
              STAGE {stage}/3 · FLOOR {node.floor ?? node.nodeNumber} · FIELD ARMORY
            </p>
            <h1 className="font-orbitron text-2xl font-black text-white">
              🛒 FIELD ARMORY SHOP
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div
              className="font-sci-num rounded-lg border border-[#ffb800]/65 bg-[#ffb800]/15 px-4 py-2 text-sm font-black text-[#ffb800]"
              data-testid="shop-credits-display"
            >
              🪙 {playerState.credits.toLocaleString()} CREDITS
            </div>
            <div className="font-sci-num rounded-lg border border-[#00f0ff]/30 bg-[#080c14]/80 px-3 py-2 text-emerald-300">
              HP {playerState.hp}/{effectiveMecha.maxHp} · EN {playerState.en}/
              {effectiveMecha.maxEn} · SP {playerState.sp}/{effectiveMaxSp}
            </div>
            <button
              type="button"
              data-testid="shop-leave-btn"
              onClick={() => onLeaveShop(playerState)}
              className="hud-btn font-orbitron cursor-pointer border border-[#00f0ff]/75 bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-extrabold text-white transition hover:brightness-115"
            >
              กลับสู่แผนที่ (CONTINUE) →
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div
          className="rounded-xl border border-[#00f0ff]/35 bg-[#0b1324]/85 px-4 py-2.5 text-xs font-semibold text-[#00f0ff] backdrop-blur-md"
          data-testid="shop-status-msg"
        >
          {statusMsg}
        </div>

        {/* Section 1: 4 Shop Offerings + Reroll */}
        <section className="hud-panel p-5 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-orbitron text-sm font-bold tracking-wider text-[#00f0ff] uppercase">
                STOCK INVENTORY (สินค้าประจำด่าน)
              </h2>
              <p className="text-xs text-slate-400">
                เลือกซื้ออาวุธ การ์ดอัปเกรด หรือรีโรลสินค้าชุดใหม่
              </p>
            </div>
            <button
              type="button"
              data-testid="shop-reroll-btn"
              disabled={playerState.credits < rerollCost}
              onClick={handleReroll}
              className="hud-btn font-orbitron cursor-pointer border border-[#ffb800]/65 bg-[#ffb800]/20 px-4 py-2 text-xs font-extrabold text-[#ffb800] transition hover:bg-[#ffb800]/30 disabled:cursor-not-allowed disabled:opacity-45"
            >
              🔄 REROLL ({rerollCost} Cr)
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {listings.map((item, idx) => {
              const c = item.choice;
              const title =
                c.kind === 'upgrade' ? c.card.name : c.weapon.name;
              const subtitle =
                c.kind === 'upgrade'
                  ? c.card.categoryLabel
                  : c.kind === 'weapon_rankup'
                    ? `Rank-Up Lv.${c.nextLevel}`
                    : `${c.weapon.type.toUpperCase()} WEAPON`;
              const desc =
                c.kind === 'upgrade'
                  ? c.card.description
                  : c.kind === 'weapon_rankup'
                    ? `+${c.powerDelta} PWR · -${c.enDelta} EN`
                    : `PWR ${c.weapon.power} · RNG ${c.weapon.minRange}-${c.weapon.maxRange} · EN ${c.weapon.enCost}`;
              const canAfford = playerState.credits >= item.price;

              return (
                <div
                  key={item.id}
                  data-testid={`shop-item-${idx}`}
                  className={`flex flex-col justify-between rounded-xl border p-4 ${
                    item.sold
                      ? 'border-slate-800 bg-[#080c14]/50 opacity-45'
                      : 'border-[#00f0ff]/35 bg-[#080c14]/85'
                  }`}
                >
                  <div>
                    <div className="font-orbitron text-[10px] font-bold text-[#ffb800] uppercase">
                      {subtitle}
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-white">
                      {title}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      {desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid={`shop-buy-${idx}`}
                    disabled={item.sold || !canAfford}
                    onClick={() => handleBuyListing(item)}
                    className="hud-btn font-sci-num mt-4 w-full cursor-pointer bg-cyan-600 py-2 text-xs font-extrabold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {item.sold ? 'SOLD OUT' : `BUY · ${item.price} Cr`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Forge Rank-Up, Field Repair & Wingman Upgrades */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Forge Weapon Rank-Up */}
          <section className="hud-panel-amber p-5 backdrop-blur-md">
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-[#ffb800] uppercase">
              🔨 FORGE RANK-UP (+250 PWR · -2 EN · {shopPrices.forgeRankUp} Cr)
            </h2>
            <div className="mt-3 space-y-2">
              {playerState.equippedWeapons.map((w) => {
                const lv = w.level ?? 1;
                const isMax = lv >= maxWeaponLv;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#080c14]/80 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-100">{w.name}</span>{' '}
                      <span className="font-sci-num text-[#ffb800]">
                        Lv.{lv}
                      </span>
                      <div className="font-sci-num text-[10px] text-slate-400">
                        PWR {w.power} · EN {w.enCost}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid={`forge-weapon-${w.id}`}
                      disabled={isMax || playerState.credits < shopPrices.forgeRankUp}
                      onClick={() => handleForgeWeapon(w.id)}
                      className="cursor-pointer rounded bg-[#ffb800]/25 px-3 py-1.5 text-[11px] font-bold text-[#ffb800] hover:bg-[#ffb800]/35 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isMax ? 'MAX LV' : `UPGRADE (${shopPrices.forgeRankUp} Cr)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Field Repair & Wingman Upgrades */}
          <section className="hud-panel p-5 backdrop-blur-md">
            <h2 className="font-orbitron text-xs font-bold tracking-wider text-[#00f0ff] uppercase">
              🔧 FIELD SUPPORT & WINGMAN UPGRADES
            </h2>
            <div className="mt-3 space-y-2.5 text-xs">
              <button
                type="button"
                data-testid="shop-repair-btn"
                disabled={playerState.credits < shopPrices.fieldRepair}
                onClick={handleFieldRepair}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-emerald-400/50 bg-emerald-950/35 px-4 py-3 text-left transition hover:bg-emerald-900/45 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div>
                  <div className="font-bold text-emerald-200">
                    🔧 Field Repair (+{shopPrices.fieldRepairPercent}% HP & EN)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    ซ่อมแซมตัวหุ่นหลักทันที
                  </div>
                </div>
                <span className="font-sci-num font-bold text-emerald-300">
                  {shopPrices.fieldRepair} Cr
                </span>
              </button>

              <button
                type="button"
                data-testid="shop-wingman-heal-btn"
                disabled={playerState.credits < shopPrices.wingmanUpgrade}
                onClick={() => handleWingmanUpgrade('heal')}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#00f0ff]/45 bg-[#00f0ff]/10 px-4 py-3 text-left transition hover:bg-[#00f0ff]/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div>
                  <div className="font-bold text-[#00f0ff]">
                    🩺 Medic Overhaul (Aegis-Medic ซ่อมแรงขึ้น +15%)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    โบนัสปัจจุบันในรอบนี้: +{playerState.wingmanHealBonus ?? 0}%
                  </div>
                </div>
                <span className="font-sci-num font-bold text-[#00f0ff]">
                  {shopPrices.wingmanUpgrade} Cr
                </span>
              </button>

              <button
                type="button"
                data-testid="shop-wingman-armor-btn"
                disabled={playerState.credits < shopPrices.wingmanUpgrade}
                onClick={() => handleWingmanUpgrade('armor')}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-violet-400/45 bg-violet-950/35 px-4 py-3 text-left transition hover:bg-violet-900/45 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div>
                  <div className="font-bold text-violet-200">
                    🛡️ Wingman Reactive Plating (+150 Armor ลูกทีมทั้งหมด)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    เกราะลูกทีมเพิ่มในรอบนี้: +{playerState.wingmanArmorBonus ?? 0}
                  </div>
                </div>
                <span className="font-sci-num font-bold text-violet-300">
                  {shopPrices.wingmanUpgrade} Cr
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Section 3: Sell Unused Weapons / Modules (35% Refund) */}
        <section className="hud-panel-rose p-5 backdrop-blur-md">
          <h2 className="font-orbitron text-xs font-bold tracking-wider text-[#ff2a55] uppercase">
            💰 SELL EQUIPMENT (ขายอาวุธ/ชิ้นส่วนรับคืน {combatConfig.economy.sellRefundPercent}%)
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-bold text-slate-400">
                อาวุธที่ติดตั้ง (ต้องเหลืออย่างน้อย 1 ชิ้น)
              </div>
              <div className="space-y-1.5">
                {playerState.equippedWeapons.map((w) => {
                  const refund = getSellValue(shopPrices.rare);
                  return (
                    <div
                      key={`sell-${w.id}`}
                      className="flex items-center justify-between rounded border border-slate-800 bg-[#080c14]/75 px-3 py-1.5 text-xs"
                    >
                      <span>{w.name}</span>
                      <button
                        type="button"
                        data-testid={`sell-weapon-${w.id}`}
                        disabled={playerState.equippedWeapons.length <= 1}
                        onClick={() => handleSellWeapon(w.id)}
                        className="cursor-pointer rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        SELL +{refund} Cr
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-bold text-slate-400">
                การ์ดอัปเกรด / ชิปที่ติดตั้ง ({playerState.installedUpgradeIds.length})
              </div>
              {playerState.installedUpgradeIds.length === 0 ? (
                <p className="text-xs text-slate-500">ไม่มีการ์ดอัปเกรด</p>
              ) : (
                <div className="space-y-1.5">
                  {playerState.installedUpgradeIds.map((uid, i) => {
                    const card = getUpgradeById(uid);
                    const refund = getSellValue(
                      card?.category === 'tactical_chips'
                        ? shopPrices.legendary
                        : shopPrices.rare
                    );
                    return (
                      <div
                        key={`sell-upg-${uid}-${i}`}
                        className="flex items-center justify-between rounded border border-slate-800 bg-[#080c14]/75 px-3 py-1.5 text-xs"
                      >
                        <span>
                          {card?.icon} {card?.name ?? uid}
                        </span>
                        <button
                          type="button"
                          data-testid={`sell-upgrade-${i}`}
                          onClick={() => handleSellUpgrade(i)}
                          className="cursor-pointer rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-200 hover:bg-rose-500/35"
                        >
                          SELL +{refund} Cr
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {pendingSwapChoice && (
        <WeaponSwapModal
          newWeapon={pendingSwapChoice.choice.weapon}
          currentWeapons={playerState.equippedWeapons}
          onSwap={handleConfirmShopSwap}
          onCancel={() => setPendingSwapChoice(null)}
        />
      )}
    </div>
  );
}
