import { useEffect, useState } from 'react';
import { BattleScreen } from './components/BattleScreen';
import {
  EventNodeScreen,
  type AmbushRequest,
} from './components/EventNodeScreen';
import { HangarScreen } from './components/HangarScreen';
import { NodeMapScreen } from './components/NodeMapScreen';
import { RunEndScreen } from './components/RunEndScreen';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeDraftModal } from './components/UpgradeDraftModal';
import { WeaponSwapModal } from './components/WeaponSwapModal';
import { audioEngine } from './logic/audioEngine';
import {
  combatConfig,
  createRunPlayerState,
  getUnitDefById,
  runNodes,
} from './logic/dataLoader';
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
  rollPostBattleDraftChoices,
} from './logic/upgradeLogic';
import type {
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

export function App() {
  const [meta, setMeta] = useState<MetaProgressState>(loadMetaProgress);
  const [savedRun, setSavedRun] = useState<SavedRunState | null>(loadSavedRun);
  const [audioPrefs, setAudioPrefs] = useState(() => audioEngine.getPrefs());
  const [screen, setScreen] = useState<ScreenView>('TITLE');
  const [runPlayer, setRunPlayer] = useState<RunPlayerState | null>(null);
  const [runThreatLevel, setRunThreatLevel] = useState(0);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [clearedNodeIds, setClearedNodeIds] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<RunNodeData | null>(null);
  const [activeAmbush, setActiveAmbush] = useState<ActiveAmbush | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [pendingSwap, setPendingSwap] = useState<PendingWeaponSwap | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummaryData | null>(null);

  const runVictory = clearedNodeIds.length >= runNodes.length;

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
    } else if (screen === 'TITLE' || screen === 'RUN_END') {
      audioEngine.setBgmTrack('standard');
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
    nodeIdx: number,
    cleared: string[]
  ) => {
    const payload = {
      runPlayer: player,
      runThreatLevel: threatLevel,
      currentNodeIndex: nodeIdx,
      clearedNodeIds: cleared,
    };
    saveActiveRun(payload);
    setSavedRun({ ...payload, savedAt: Date.now() });
  };

  const handleStartRun = (
    unitDefId: string,
    startingAllyIds: string[],
    threatLevel: number
  ) => {
    audioEngine.unlock();
    audioEngine.playSfx('click');
    const initialPlayer = createRunPlayerState(unitDefId, meta, startingAllyIds);
    setRunPlayer(initialPlayer);
    setRunThreatLevel(threatLevel);
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setRunSummary(null);
    persistProgress(initialPlayer, threatLevel, 0, []);
    setScreen('NODE_MAP');
  };

  const handleContinueSavedRun = () => {
    if (!savedRun) return;
    audioEngine.unlock();
    audioEngine.playSfx('click');
    setRunPlayer(savedRun.runPlayer);
    setRunThreatLevel(savedRun.runThreatLevel);
    setCurrentNodeIndex(savedRun.currentNodeIndex);
    setClearedNodeIds(savedRun.clearedNodeIds);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
    setRunSummary(null);
    setScreen('NODE_MAP');
  };

  const handleReturnToHangar = () => {
    audioEngine.playSfx('click');
    setRunPlayer(null);
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setPendingSwap(null);
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
    const ambushNode: RunNodeData = {
      id: `${activeNode.id}_ambush`,
      nodeNumber: activeNode.nodeNumber,
      title: 'Distress Signal Rescue',
      type: 'standard_battle',
      typeLabel: 'Rescue Skirmish',
      description: 'กำจัดศัตรูกลุ่มย่อยเพื่อช่วยพันธมิตรเข้าทีม!',
      enemySpawns: [
        {
          templateId: 'enemy_sentinel',
          labelSuffix: 'Raider',
          position: { row: 1, col: 5 },
        },
        {
          templateId: 'enemy_viper',
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
    nodesClearedCount: number,
    playerSnapshot: RunPlayerState
  ) => {
    clearSavedRun();
    setSavedRun(null);

    const reward = calculateRunShardsReward(
      nodesClearedCount,
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
      nodesCleared: nodesClearedCount,
      totalNodes: runNodes.length,
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

    const nextCleared = clearedNodeIds.includes(node.id)
      ? clearedNodeIds
      : [...clearedNodeIds, node.id];
    const nextIdx = Math.min(runNodes.length, nextCleared.length);

    setRunPlayer(updatedPlayer);
    setClearedNodeIds(nextCleared);
    setCurrentNodeIndex(nextIdx);

    if (node.type === 'boss_battle' || nextCleared.length >= runNodes.length) {
      triggerRunEnd('victory', nextCleared.length, updatedPlayer);
      return;
    }

    persistProgress(updatedPlayer, runThreatLevel, nextIdx, nextCleared);
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

    if (activeNode.type !== 'boss_battle') {
      const mainDef = getUnitDefById(updatedPlayer.unitDefId);
      const mechaId = mainDef?.mecha.id ?? 'giga_rex';
      const choices = rollPostBattleDraftChoices(updatedPlayer, mechaId, 3);
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
    triggerRunEnd('defeat', clearedNodeIds.length, runPlayer);
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

  if (screen === 'TITLE') {
    return (
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
  }

  if (screen === 'RUN_END' && runSummary) {
    return (
      <RunEndScreen
        summary={runSummary}
        onReturnToHangar={handleReturnToHangar}
      />
    );
  }

  if (screen === 'HANGAR' || !runPlayer) {
    return (
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
  }

  if (screen === 'EVENT' && activeNode) {
    return (
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
  }

  if (screen === 'BATTLE' && (activeAmbush || activeNode)) {
    const battleNode = activeAmbush ? activeAmbush.ambushNode : activeNode!;
    return (
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
            nodeNumber={pendingDraft.node.nodeNumber}
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
  }

  return (
    <NodeMapScreen
      nodes={runNodes}
      currentNodeIndex={currentNodeIndex}
      clearedNodeIds={clearedNodeIds}
      runPlayer={runPlayer}
      meta={meta}
      runVictory={runVictory}
      onEnterNode={handleEnterNode}
      onReturnToHangar={handleReturnToHangar}
    />
  );
}

export default App;
