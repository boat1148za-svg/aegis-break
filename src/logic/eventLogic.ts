import eventsJson from '../data/events.json';
import {
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
} from './dataLoader';
import { installUpgradeOnRunPlayer, upgradeCards } from './upgradeLogic';
import type {
  MetaProgressState,
  NarrativeEventChoice,
  NarrativeEventData,
  RunPlayerState,
} from './types';

export const narrativeEvents = eventsJson as NarrativeEventData[];

export function pickRandomNarrativeEvent(): NarrativeEventData {
  const idx = Math.floor(Math.random() * narrativeEvents.length);
  return narrativeEvents[idx] ?? narrativeEvents[0];
}

export interface NarrativeChoiceResolution {
  updatedPlayer: RunPlayerState;
  shardsEarned: number;
  resultMessage: string;
  triggerAmbushBattle?: boolean;
  rewardAllyId?: string;
  fallbackShards?: number;
}

export function resolveNarrativeEventChoice(
  choice: NarrativeEventChoice,
  runPlayer: RunPlayerState,
  meta: MetaProgressState
): NarrativeChoiceResolution {
  const e = choice.effects;

  if (e.triggerAmbushBattle) {
    return {
      updatedPlayer: runPlayer,
      shardsEarned: 0,
      resultMessage: 'เตรียมพร้อมเข้าปะทะศัตรูกลุ่มย่อยเพื่อช่วยเหลือพันธมิตร!',
      triggerAmbushBattle: true,
      rewardAllyId: e.rewardAllyId,
      fallbackShards: e.fallbackShards,
    };
  }

  let updatedPlayer = { ...runPlayer };
  const effectiveMecha = getEffectivePlayerMecha(runPlayer, meta);
  const maxHp = effectiveMecha.maxHp;
  const maxEn = effectiveMecha.maxEn;
  const maxSp = getEffectivePlayerMaxSp(runPlayer, meta);

  const summaryParts: string[] = [];
  let shardsEarned = 0;

  if (e.hpChangePercent) {
    const delta = Math.round((maxHp * e.hpChangePercent) / 100);
    // Never kill the player directly from an event (leave at least 1 HP)
    const nextHp = Math.max(1, Math.min(maxHp, updatedPlayer.hp + delta));
    const actual = nextHp - updatedPlayer.hp;
    updatedPlayer.hp = nextHp;
    summaryParts.push(
      actual >= 0 ? `HP +${actual.toLocaleString()}` : `HP ${actual.toLocaleString()}`
    );
  }

  if (e.enChangePercent) {
    const delta = Math.round((maxEn * e.enChangePercent) / 100);
    const nextEn = Math.max(0, Math.min(maxEn, updatedPlayer.en + delta));
    const actual = nextEn - updatedPlayer.en;
    updatedPlayer.en = nextEn;
    summaryParts.push(actual >= 0 ? `EN +${actual}` : `EN ${actual}`);
  }

  if (e.spChangePercent) {
    const delta = Math.round((maxSp * e.spChangePercent) / 100);
    const nextSp = Math.max(0, Math.min(maxSp, updatedPlayer.sp + delta));
    const actual = nextSp - updatedPlayer.sp;
    updatedPlayer.sp = nextSp;
    summaryParts.push(actual >= 0 ? `SP +${actual}` : `SP ${actual}`);
  }

  if (e.maxWillBonus) {
    updatedPlayer.maxWillBonus += e.maxWillBonus;
    summaryParts.push(`Max Will +${e.maxWillBonus}`);
  }

  if (e.grantShards) {
    shardsEarned += e.grantShards;
    summaryParts.push(`✨ +${e.grantShards} Astral Shards`);
  }

  if (e.grantRandomCategory) {
    const pool = upgradeCards.filter(
      (c) =>
        c.category === e.grantRandomCategory &&
        !(c.unique && updatedPlayer.installedUpgradeIds.includes(c.id))
    );
    if (pool.length > 0) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      updatedPlayer = installUpgradeOnRunPlayer(updatedPlayer, picked);
      summaryParts.push(`ได้รับ ${picked.icon} ${picked.name} (${picked.nameTh})`);
    } else {
      shardsEarned += 40;
      summaryParts.push('ติดตั้งครบทุกชิ้นแล้ว → ได้รับ ✨ +40 Astral Shards แทน');
    }
  }

  return {
    updatedPlayer,
    shardsEarned,
    resultMessage: `${choice.label}: ${summaryParts.join(' · ')}`,
  };
}
