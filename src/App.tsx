import { useEffect, useState, type ReactNode } from 'react';
import { BattleScreen } from './components/BattleScreen';
import {
  EventNodeScreen,
  type AmbushRequest,
} from './components/EventNodeScreen';
import { HangarScreen } from './components/HangarScreen';
import { NodeMapScreen } from './components/NodeMapScreen';
import { PostProcessOverlay } from './components/PostProcessOverlay';
import { RunEndScreen } from './components/RunEndScreen';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeDraftModal } from './components/UpgradeDraftModal';
import { WeaponSwapModal } from './components/WeaponSwapModal';
import { audioEngine } from './logic/audioEngine';
import {
  combatConfig,
  createRunPlayerState,
  getEffectivePlayerMecha,
  getUnitDefById,
} from './logic/dataLoader';
import { createRandomSeed, generateStageMap } from './logic/mapGenerator';
import {
  calculateRunShardsReward,
  loadMetaProgress,
  purchaseMetaUpgrade,
  saveMetaProgress,
  threatLevels,
} from './logic/metaLogic';
import {
  clearSavedRun,
  loadSavedRun,
  saveActiveRun,
  type SavedRunState,
} from './logic/runSaveLogic';
import {
  equipWeaponOnRunPlayer,
  installUpgradeOnRunPlayer,
  rankUpWeaponOnRunPlayer,
  rollPostBattleDraftChoices,
} from './logic/upgradeLogic';
import type {
  BranchingStageMap,
  DraftChoice,
  MetaProgressState,
  RunNodeData,
  RunPlayerState,
  RunSummaryData,
  ScreenView,
  WeaponData,
} from './logic/types';

interface PendingDraft {
  node: RunNodeData;
  playerAfterBattle: RunPlayerState;
  choices: DraftChoice[];
  stageClearBanner?: string | null;
}

interface PendingWeaponSwap {
  newWeapon: WeaponData;
}

interface ActiveAmbush {
  parentNode: RunNodeData;
  ambushNode: RunNodeData;
  rewardAllyId?: string;
  fallbackShards?: number;
}

interface PendingStageAdvance {
  nextStage: 2 | 3;
}

const TOTAL_CAMPAIGN_FLOORS =
  combatConfig.campaign.totalStages * combatConfig.campaign.floorsPerStage;

export function App() {
  const [meta, setMeta] = useState<MetaProgressState>(loadMetaProgress);
  const [savedRun, setSavedRun] = useState<SavedRunState | null>(loadSavedRun);
  const [audioPrefs, setAudioPrefs] = useState(() => audioEngine.getPrefs());
  const [screen, setScreen] = useState<ScreenView>('TITLE');
  const [runPlayer, setRunPlayer] = useState<RunPlayerState | null>(null);
  const [runThreatLevel, setRunThreatLevel] = useState(0);
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [stageMap, setStageMap] = useState<BranchingStageMap | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [clearedNodeIds, setClearedNodeIds] = useState<string[]>([]);
  const [totalFloorsCleared, setTotalFloorsCleared] = useState(0);
  const [runSeed, setRunSeed] = useState<number>(createRandomSeed);
  const [activeNode, setActiveNode] = useState<RunNodeData | null>(null);
  const [activeAmbush, setActiveAmbush] = useState<ActiveAmbush | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [pendingSwap, setPendingSwap] = useState<PendingWeaponSwap | null>(null);
  const [pendingStageAdvance, setPendingStageAdvance] =
    useState<PendingStageAdvance | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummaryData | null>(null);

  const runVictory = totalFloorsCleared >= TOTAL_CAMPAIGN_FLOORS;

  // Unlock Web Audio Context on first user click anywhere
  useEffect(() => {
    const unlockAudio = () => audioEngine.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // Automatically switch procedural Synth BGM between Standard & Boss tracks
  useEffect(() => {
    if (screen === 'BATTLE' && activeNode?.type === 'boss_battle' && !activeAmbush) {
      audioEngine.setBgmTrack('boss');
    } else {
      audioEngine.setBgmTrack('standard');
    }
  }, [screen, activeNode, activeAmbush]);

  const handleToggleBgm = () => {
    audioEngine.unlock();
    const next = audioEngine.setBgmEnabled(!audioPrefs.bgmEnabled);
    setAudioPrefs(next);
  };

  const handleToggleSfx = () => {
    audioEngine.unlock();
    const next = audioEngine.setSfxEnabled(!audioPrefs.sfxEnabled);
    setAudioPrefs(next);
    if (next.sfxEnabled) audioEngine.playSfx('click');
  };

  const grantShardsImmediately = (amount: number) => {
    if (amount <= 0) return;
    setMeta((prev) => {
      const updated = { ...prev, astralShards: prev.astralShards + amount };
      saveMetaProgress(updated);
      return updated;
    });
  };

  const handlePurchaseMetaUpgrade = (upgradeId: string) => {
    audioEngine.playSfx('spirit');
    setMeta((prev) => purchaseMetaUpgrade(prev, upgradeId));
  };

  const persistProgress = (
    player: RunPlayerState,
    threatLevel: number,
    stage: 1 | 2 | 3,
    map: BranchingStageMap,
    nodeId: string | null,
    cleared: string[],
    floorsCleared: number,
    seed: number
  ) => {
    const payload: Omit<SavedRunState, 'savedAt'> = {
      runPlayer: player,
      runThreatLevel: threatLevel,
      currentStage: stage,
      stageMap: map,
      currentNodeId: nodeId,
      clearedNodeIds: cleared,
      totalFloorsCleared: floorsCleared,
      runSeed: seed,
    };
    saveActiveRun(payload);
    setSavedRun({ ...payload, savedAt: Date.now() });
  };

  const handleStartRun = (
    unitDefId: string,
    startingAllyIds: string[],
    threatLevel: number,
    seedInput?: number
  ) => {
    audioEngine.unlock();
    audioEngine.playSfx('click');
    const seed = seedInput ?? createRandomSeed();
    const initialMap = generateStageMap(1, seed);
    const initialPlayer = createRunPlayerState(unitDefId, meta, startingAllyIds);

    setRunPlayer(initialPlayer);
    setRunThreatLevel(threatLevel);
    setCurrentStage(1);
    setStageMap(initialMap);
    setCurrentNodeId(null);
    setClearedNodeIds([]);
    setTotalFloorsCleared(0);
    setRunSeed(seed);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setPendingStageAdvance(null);
    setRunSummary(null);
    persistProgress(
      initialPlayer,
      threatLevel,
      1,
      initialMap,
      null,
      [],
      0,
      seed
    );
    setScreen('NODE_MAP');
  };

  const handleContinueSavedRun = () => {
    if (!savedRun) return;
    audioEngine.unlock();
    audioEngine.playSfx('click');
    setRunPlayer(savedRun.runPlayer);
    setRunThreatLevel(savedRun.runThreatLevel);
    setCurrentStage(savedRun.currentStage);
    setStageMap(savedRun.stageMap);
    setCurrentNodeId(savedRun.currentNodeId);
    setClearedNodeIds(savedRun.clearedNodeIds);
    setTotalFloorsCleared(savedRun.totalFloorsCleared);
    setRunSeed(savedRun.runSeed);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setPendingStageAdvance(null);
    setRunSummary(null);
    setScreen('NODE_MAP');
  };

  const handleReturnToHangar = () => {
    audioEngine.playSfx('click');
    setRunPlayer(null);
    setCurrentStage(1);
    setStageMap(null);
    setCurrentNodeId(null);
    setClearedNodeIds([]);
    setTotalFloorsCleared(0);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setPendingStageAdvance(null);
    setRunSummary(null);
    setSavedRun(loadSavedRun());
    setScreen('HANGAR');
  };

  const handleEnterNode = (node: RunNodeData) => {
    audioEngine.unlock();
    audioEngine.playSfx('click');
    setActiveNode(node);
    setActiveAmbush(null);
    if (node.type === 'repair_event' || node.type === 'repair_supply') {
      setScreen('EVENT');
    } else {
      setScreen('BATTLE');
    }
  };

  const handleTriggerAmbushBattle = (ambush: AmbushRequest) => {
    if (!activeNode) return;
    const stageNum = activeNode.stage ?? currentStage;
    const gruntId =
      stageNum === 3
        ? 'enemy_sentinel_s3'
        : stageNum === 2
          ? 'enemy_sentinel_s2'
          : 'enemy_sentinel';
    const scoutId =
      stageNum === 3
        ? 'enemy_viper_s3'
        : stageNum === 2
          ? 'enemy_viper_s2'
          : 'enemy_viper';

    const ambushNode: RunNodeData = {
      id: `${activeNode.id}_ambush`,
      nodeNumber: activeNode.nodeNumber,
      stage: stageNum,
      floor: activeNode.floor,
      title: 'Distress Signal Rescue',
      type: 'standard_battle',
      typeLabel: 'Rescue Skirmish',
      description: 'กำจัดศัตรูกลุ่มย่อยเพื่อช่วยพันธมิตรเข้าทีม!',
      enemySpawns: [
        {
          templateId: gruntId,
          labelSuffix: 'Raider',
          position: { row: 1, col: 5 },
        },
        {
          templateId: scoutId,
          labelSuffix: 'Scout',
          position: { row: 2, col: 6 },
        },
      ],
    };

    setActiveAmbush({
      parentNode: activeNode,
      ambushNode,
      rewardAllyId: ambush.rewardAllyId,
      fallbackShards: ambush.fallbackShards,
    });
    setScreen('BATTLE');
  };

  const triggerRunEnd = (
    outcome: 'victory' | 'defeat',
    floorsClearedCount: number,
    playerSnapshot: RunPlayerState
  ) => {
    clearSavedRun();
    setSavedRun(null);

    const reward = calculateRunShardsReward(
      floorsClearedCount,
      outcome === 'victory',
      runThreatLevel
    );

    const maxThreat = threatLevels.length - 1;
    let nextUnlockedThreat = meta.maxUnlockedThreatLevel;
    let unlockedNewThreatLevel: number | null = null;
    if (
      outcome === 'victory' &&
      runThreatLevel >= meta.maxUnlockedThreatLevel &&
      meta.maxUnlockedThreatLevel < maxThreat
    ) {
      nextUnlockedThreat = meta.maxUnlockedThreatLevel + 1;
      unlockedNewThreatLevel = nextUnlockedThreat;
    }

    const updatedMeta: MetaProgressState = {
      ...meta,
      astralShards: meta.astralShards + reward.totalShardsEarned,
      totalRuns: meta.totalRuns + 1,
      victories: meta.victories + (outcome === 'victory' ? 1 : 0),
      maxUnlockedThreatLevel: nextUnlockedThreat,
    };
    saveMetaProgress(updatedMeta);
    setMeta(updatedMeta);

    setRunSummary({
      outcome,
      unitDefId: playerSnapshot.unitDefId,
      threatLevel: runThreatLevel,
      unlockedNewThreatLevel,
      nodesCleared: floorsClearedCount,
      totalNodes: TOTAL_CAMPAIGN_FLOORS,
      installedUpgradeCount: playerSnapshot.installedUpgradeIds.length,
      shardsFromNodes: reward.shardsFromNodes,
      bonusShards: reward.bonusShards,
      shardMultiplier: reward.shardMultiplier,
      totalShardsEarned: reward.totalShardsEarned,
      newTotalShards: updatedMeta.astralShards,
    });
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setPendingStageAdvance(null);
    setScreen('RUN_END');
  };

  const finalizeNodeAndReturnToMap = (
    node: RunNodeData,
    updatedPlayer: RunPlayerState,
    shardsEarned: number = 0
  ) => {
    if (shardsEarned > 0) {
      grantShardsImmediately(shardsEarned);
    }

    const nextFloorsCleared = totalFloorsCleared + 1;
    setRunPlayer(updatedPlayer);
    setTotalFloorsCleared(nextFloorsCleared);

    // Stage 1 -> Stage 2 or Stage 2 -> Stage 3 transition after Stage Boss + High-Tier Draft
    if (pendingStageAdvance) {
      const nextStage = pendingStageAdvance.nextStage;
      const nextMap = generateStageMap(nextStage, runSeed + nextStage * 9973);

      setCurrentStage(nextStage);
      setStageMap(nextMap);
      setCurrentNodeId(null);
      setClearedNodeIds([]);
      setPendingStageAdvance(null);
      persistProgress(
        updatedPlayer,
        runThreatLevel,
        nextStage,
        nextMap,
        null,
        [],
        nextFloorsCleared,
        runSeed
      );
      setActiveNode(null);
      setActiveAmbush(null);
      setPendingDraft(null);
      setPendingSwap(null);
      setScreen('NODE_MAP');
      return;
    }

    // Final Stage 3 Boss Victory -> Run Complete!
    if (node.type === 'boss_battle' && currentStage >= 3) {
      triggerRunEnd('victory', nextFloorsCleared, updatedPlayer);
      return;
    }

    const nextCleared = clearedNodeIds.includes(node.id)
      ? clearedNodeIds
      : [...clearedNodeIds, node.id];
    setCurrentNodeId(node.id);
    setClearedNodeIds(nextCleared);

    if (stageMap) {
      persistProgress(
        updatedPlayer,
        runThreatLevel,
        currentStage,
        stageMap,
        node.id,
        nextCleared,
        nextFloorsCleared,
        runSeed
      );
    }
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setScreen('NODE_MAP');
  };

  const handleBattleVictory = (updatedPlayer: RunPlayerState) => {
    if (activeAmbush) {
      let rewardedPlayer = updatedPlayer;
      let bonusShards = 0;

      if (
        activeAmbush.rewardAllyId &&
        !updatedPlayer.squadAllyIds.includes(activeAmbush.rewardAllyId) &&
        updatedPlayer.squadAllyIds.length + 1 <
          combatConfig.support.maxSquadSize
      ) {
        rewardedPlayer = {
          ...updatedPlayer,
          squadAllyIds: [
            ...updatedPlayer.squadAllyIds,
            activeAmbush.rewardAllyId,
          ],
        };
      } else if (activeAmbush.fallbackShards) {
        bonusShards = activeAmbush.fallbackShards;
      }

      finalizeNodeAndReturnToMap(
        activeAmbush.parentNode,
        rewardedPlayer,
        bonusShards
      );
      return;
    }

    if (!activeNode) return;

    const mainDef = getUnitDefById(updatedPlayer.unitDefId);
    const mechaId = mainDef?.mecha.id ?? 'giga_rex';

    // Stage 1 or Stage 2 Boss Cleared -> +75% HP & EN Stage Clear Bonus + High-Tier Draft!
    if (activeNode.type === 'boss_battle' && currentStage < 3) {
      const effectiveMecha = getEffectivePlayerMecha(updatedPlayer, meta);
      const healPct = combatConfig.campaign.stageClearHealPercent;
      const healedPlayer: RunPlayerState = {
        ...updatedPlayer,
        hp: Math.min(
          effectiveMecha.maxHp,
          updatedPlayer.hp + Math.round((effectiveMecha.maxHp * healPct) / 100)
        ),
        en: Math.min(
          effectiveMecha.maxEn,
          updatedPlayer.en + Math.round((effectiveMecha.maxEn * healPct) / 100)
        ),
      };

      const highTierChoices = rollPostBattleDraftChoices(
        healedPlayer,
        mechaId,
        currentStage,
        3,
        true
      );
      const nextStage = (currentStage + 1) as 2 | 3;

      if (highTierChoices.length > 0) {
        setPendingStageAdvance({ nextStage });
        setPendingDraft({
          node: activeNode,
          playerAfterBattle: healedPlayer,
          choices: highTierChoices,
          stageClearBanner: `🎉 STAGE ${currentStage}/3 CLEAR BONUS — ฟื้นฟู HP +${healPct}% และ EN +${healPct}% ให้หุ่นทุกเครื่องแล้ว! เลือกรางวัลระดับสูงก่อนเข้าสู่ Stage ${nextStage}/3`,
        });
        return;
      }

      const nextMap = generateStageMap(nextStage, runSeed + nextStage * 9973);
      setCurrentStage(nextStage);
      setStageMap(nextMap);
      setCurrentNodeId(null);
      setClearedNodeIds([]);
      const nextFloorsCleared = totalFloorsCleared + 1;
      setRunPlayer(healedPlayer);
      setTotalFloorsCleared(nextFloorsCleared);
      persistProgress(
        healedPlayer,
        runThreatLevel,
        nextStage,
        nextMap,
        null,
        [],
        nextFloorsCleared,
        runSeed
      );
      setActiveNode(null);
      setScreen('NODE_MAP');
      return;
    }

    // Normal / Elite post-battle draft weighted by current Stage
    if (activeNode.type !== 'boss_battle') {
      const choices = rollPostBattleDraftChoices(
        updatedPlayer,
        mechaId,
        currentStage,
        3,
        false
      );
      if (choices.length > 0) {
        setPendingDraft({
          node: activeNode,
          playerAfterBattle: updatedPlayer,
          choices,
        });
        return;
      }
    }

    finalizeNodeAndReturnToMap(activeNode, updatedPlayer);
  };

  const handleBattleDefeat = () => {
    if (!runPlayer) {
      handleReturnToHangar();
      return;
    }
    triggerRunEnd('defeat', totalFloorsCleared, runPlayer);
  };

  const handleSelectDraftChoice = (choice: DraftChoice) => {
    if (!pendingDraft) return;
    audioEngine.playSfx('spirit');

    if (choice.kind === 'upgrade') {
      const upgradedPlayer = installUpgradeOnRunPlayer(
        pendingDraft.playerAfterBattle,
        choice.card
      );
      finalizeNodeAndReturnToMap(pendingDraft.node, upgradedPlayer);
      return;
    }

    if (choice.kind === 'weapon_rankup') {
      const rankedPlayer = rankUpWeaponOnRunPlayer(
        pendingDraft.playerAfterBattle,
        choice.weapon.id
      );
      finalizeNodeAndReturnToMap(pendingDraft.node, rankedPlayer);
      return;
    }

    const currentCount = pendingDraft.playerAfterBattle.equippedWeapons.length;
    if (currentCount >= combatConfig.weapons.maxSlots) {
      setPendingSwap({ newWeapon: choice.weapon });
      return;
    }

    const equippedPlayer = equipWeaponOnRunPlayer(
      pendingDraft.playerAfterBattle,
      choice.weapon
    );
    finalizeNodeAndReturnToMap(pendingDraft.node, equippedPlayer);
  };

  const handleConfirmWeaponSwap = (replaceWeaponId: string) => {
    if (!pendingDraft || !pendingSwap) return;
    audioEngine.playSfx('spirit');
    const swappedPlayer = equipWeaponOnRunPlayer(
      pendingDraft.playerAfterBattle,
      pendingSwap.newWeapon,
      replaceWeaponId
    );
    finalizeNodeAndReturnToMap(pendingDraft.node, swappedPlayer);
  };

  let content: ReactNode;

  if (screen === 'TITLE') {
    content = (
      <TitleScreen
        savedRun={savedRun}
        bgmEnabled={audioPrefs.bgmEnabled}
        sfxEnabled={audioPrefs.sfxEnabled}
        onToggleBgm={handleToggleBgm}
        onToggleSfx={handleToggleSfx}
        onNewRun={() => {
          audioEngine.unlock();
          audioEngine.playSfx('click');
          setScreen('HANGAR');
        }}
        onContinueRun={handleContinueSavedRun}
      />
    );
  } else if (screen === 'RUN_END' && runSummary) {
    content = (
      <RunEndScreen
        summary={runSummary}
        onReturnToHangar={handleReturnToHangar}
      />
    );
  } else if (screen === 'HANGAR' || !runPlayer || !stageMap) {
    content = (
      <HangarScreen
        meta={meta}
        onStartRun={handleStartRun}
        onPurchaseMetaUpgrade={handlePurchaseMetaUpgrade}
        onBackToTitle={() => {
          audioEngine.playSfx('click');
          setSavedRun(loadSavedRun());
          setScreen('TITLE');
        }}
      />
    );
  } else if (screen === 'EVENT' && activeNode) {
    content = (
      <EventNodeScreen
        key={activeNode.id}
        node={activeNode}
        runPlayer={runPlayer}
        meta={meta}
        onCompleteEvent={(updated, shardsEarned) =>
          finalizeNodeAndReturnToMap(activeNode, updated, shardsEarned)
        }
        onTriggerAmbushBattle={handleTriggerAmbushBattle}
      />
    );
  } else if (screen === 'BATTLE' && (activeAmbush || activeNode)) {
    const battleNode = activeAmbush ? activeAmbush.ambushNode : activeNode!;
    content = (
      <>
        <BattleScreen
          key={battleNode.id}
          node={battleNode}
          runPlayer={runPlayer}
          meta={meta}
          threatLevel={runThreatLevel}
          bgmEnabled={audioPrefs.bgmEnabled}
          sfxEnabled={audioPrefs.sfxEnabled}
          onToggleBgm={handleToggleBgm}
          onToggleSfx={handleToggleSfx}
          onBattleVictory={handleBattleVictory}
          onBattleDefeat={handleBattleDefeat}
        />
        {pendingDraft && !pendingSwap && (
          <UpgradeDraftModal
            nodeNumber={pendingDraft.node.floor ?? pendingDraft.node.nodeNumber}
            stage={currentStage}
            stageClearBanner={pendingDraft.stageClearBanner}
            choices={pendingDraft.choices}
            equippedWeaponCount={
              pendingDraft.playerAfterBattle.equippedWeapons.length
            }
            onSelectChoice={handleSelectDraftChoice}
          />
        )}
        {pendingDraft && pendingSwap && (
          <WeaponSwapModal
            newWeapon={pendingSwap.newWeapon}
            currentWeapons={pendingDraft.playerAfterBattle.equippedWeapons}
            onSwap={handleConfirmWeaponSwap}
            onCancel={() => setPendingSwap(null)}
          />
        )}
      </>
    );
  } else {
    content = (
      <NodeMapScreen
        stageMap={stageMap}
        currentNodeId={currentNodeId}
        clearedNodeIds={clearedNodeIds}
        totalFloorsCleared={totalFloorsCleared}
        runPlayer={runPlayer}
        meta={meta}
        runVictory={runVictory}
        onEnterNode={handleEnterNode}
        onReturnToHangar={handleReturnToHangar}
      />
    );
  }

  return (
    <>
      {content}
      <PostProcessOverlay />
    </>
  );
}

export default App;
