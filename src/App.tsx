import { useState } from 'react';
import { BattleScreen } from './components/BattleScreen';
import {
  EventNodeScreen,
  type AmbushRequest,
} from './components/EventNodeScreen';
import { HangarScreen } from './components/HangarScreen';
import { NodeMapScreen } from './components/NodeMapScreen';
import { RunEndScreen } from './components/RunEndScreen';
import { UpgradeDraftModal } from './components/UpgradeDraftModal';
import {
  combatConfig,
  createRunPlayerState,
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
  installUpgradeOnRunPlayer,
  rollUpgradeDraftChoices,
} from './logic/upgradeLogic';
import type {
  MetaProgressState,
  RunNodeData,
  RunPlayerState,
  RunSummaryData,
  ScreenView,
  UpgradeCardData,
} from './logic/types';

interface PendingDraft {
  node: RunNodeData;
  playerAfterBattle: RunPlayerState;
  choices: UpgradeCardData[];
}

interface ActiveAmbush {
  parentNode: RunNodeData;
  ambushNode: RunNodeData;
  rewardAllyId?: string;
  fallbackShards?: number;
}

export function App() {
  const [meta, setMeta] = useState<MetaProgressState>(loadMetaProgress);
  const [screen, setScreen] = useState<ScreenView>('HANGAR');
  const [runPlayer, setRunPlayer] = useState<RunPlayerState | null>(null);
  const [runThreatLevel, setRunThreatLevel] = useState(0);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [clearedNodeIds, setClearedNodeIds] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<RunNodeData | null>(null);
  const [activeAmbush, setActiveAmbush] = useState<ActiveAmbush | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummaryData | null>(null);

  const runVictory = clearedNodeIds.length >= runNodes.length;

  const grantShardsImmediately = (amount: number) => {
    if (amount <= 0) return;
    setMeta((prev) => {
      const updated = { ...prev, astralShards: prev.astralShards + amount };
      saveMetaProgress(updated);
      return updated;
    });
  };

  const handlePurchaseMetaUpgrade = (upgradeId: string) => {
    setMeta((prev) => purchaseMetaUpgrade(prev, upgradeId));
  };

  const handleStartRun = (
    unitDefId: string,
    startingAllyIds: string[],
    threatLevel: number
  ) => {
    setRunPlayer(createRunPlayerState(unitDefId, meta, startingAllyIds));
    setRunThreatLevel(threatLevel);
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setRunSummary(null);
    setScreen('NODE_MAP');
  };

  const handleReturnToHangar = () => {
    setRunPlayer(null);
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setRunSummary(null);
    setScreen('HANGAR');
  };

  const handleEnterNode = (node: RunNodeData) => {
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

    setRunPlayer(updatedPlayer);
    setClearedNodeIds(nextCleared);
    setCurrentNodeIndex(Math.min(runNodes.length, nextCleared.length));

    if (node.type === 'boss_battle' || nextCleared.length >= runNodes.length) {
      triggerRunEnd('victory', nextCleared.length, updatedPlayer);
      return;
    }

    setActiveNode(null);
    setActiveAmbush(null);
    setPendingDraft(null);
    setScreen('NODE_MAP');
  };

  const handleBattleVictory = (updatedPlayer: RunPlayerState) => {
    // Handle Narrative Event Ambush victory (recruit ally or grant fallback shards)
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
      const choices = rollUpgradeDraftChoices(
        updatedPlayer.installedUpgradeIds,
        3
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
    triggerRunEnd('defeat', clearedNodeIds.length, runPlayer);
  };

  const handleSelectDraftCard = (card: UpgradeCardData) => {
    if (!pendingDraft) return;
    const upgradedPlayer = installUpgradeOnRunPlayer(
      pendingDraft.playerAfterBattle,
      card
    );
    finalizeNodeAndReturnToMap(pendingDraft.node, upgradedPlayer);
  };

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
          onBattleVictory={handleBattleVictory}
          onBattleDefeat={handleBattleDefeat}
        />
        {pendingDraft && (
          <UpgradeDraftModal
            nodeNumber={pendingDraft.node.nodeNumber}
            choices={pendingDraft.choices}
            onSelectCard={handleSelectDraftCard}
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
