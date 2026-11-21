import { useState } from 'react';
import { BattleScreen } from './components/BattleScreen';
import { EventNodeScreen } from './components/EventNodeScreen';
import { HangarScreen } from './components/HangarScreen';
import { NodeMapScreen } from './components/NodeMapScreen';
import { RunEndScreen } from './components/RunEndScreen';
import { UpgradeDraftModal } from './components/UpgradeDraftModal';
import { createRunPlayerState, runNodes } from './logic/dataLoader';
import {
  calculateRunShardsReward,
  loadMetaProgress,
  purchaseMetaUpgrade,
  saveMetaProgress,
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

export function App() {
  const [meta, setMeta] = useState<MetaProgressState>(loadMetaProgress);
  const [screen, setScreen] = useState<ScreenView>('HANGAR');
  const [runPlayer, setRunPlayer] = useState<RunPlayerState | null>(null);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [clearedNodeIds, setClearedNodeIds] = useState<string[]>([]);
  const [activeNode, setActiveNode] = useState<RunNodeData | null>(null);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummaryData | null>(null);

  const runVictory = clearedNodeIds.length >= runNodes.length;

  const handlePurchaseMetaUpgrade = (upgradeId: string) => {
    setMeta((prev) => purchaseMetaUpgrade(prev, upgradeId));
  };

  const handleStartRun = (unitDefId: string) => {
    setRunPlayer(createRunPlayerState(unitDefId, meta));
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setPendingDraft(null);
    setRunSummary(null);
    setScreen('NODE_MAP');
  };

  const handleReturnToHangar = () => {
    setRunPlayer(null);
    setCurrentNodeIndex(0);
    setClearedNodeIds([]);
    setActiveNode(null);
    setPendingDraft(null);
    setRunSummary(null);
    setScreen('HANGAR');
  };

  const handleEnterNode = (node: RunNodeData) => {
    setActiveNode(node);
    if (node.type === 'repair_event' || node.type === 'repair_supply') {
      setScreen('EVENT');
    } else {
      setScreen('BATTLE');
    }
  };

  const triggerRunEnd = (
    outcome: 'victory' | 'defeat',
    nodesClearedCount: number,
    playerSnapshot: RunPlayerState
  ) => {
    const reward = calculateRunShardsReward(
      nodesClearedCount,
      outcome === 'victory'
    );

    const updatedMeta: MetaProgressState = {
      ...meta,
      astralShards: meta.astralShards + reward.totalShardsEarned,
      totalRuns: meta.totalRuns + 1,
      victories: meta.victories + (outcome === 'victory' ? 1 : 0),
    };
    saveMetaProgress(updatedMeta);
    setMeta(updatedMeta);

    setRunSummary({
      outcome,
      unitDefId: playerSnapshot.unitDefId,
      nodesCleared: nodesClearedCount,
      totalNodes: runNodes.length,
      installedUpgradeCount: playerSnapshot.installedUpgradeIds.length,
      shardsFromNodes: reward.shardsFromNodes,
      bonusShards: reward.bonusShards,
      totalShardsEarned: reward.totalShardsEarned,
      newTotalShards: updatedMeta.astralShards,
    });
    setActiveNode(null);
    setPendingDraft(null);
    setScreen('RUN_END');
  };

  const finalizeNodeAndReturnToMap = (
    node: RunNodeData,
    updatedPlayer: RunPlayerState
  ) => {
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
    setPendingDraft(null);
    setScreen('NODE_MAP');
  };

  const handleBattleVictory = (updatedPlayer: RunPlayerState) => {
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
        onCompleteEvent={(updated) =>
          finalizeNodeAndReturnToMap(activeNode, updated)
        }
      />
    );
  }

  if (screen === 'BATTLE' && activeNode) {
    return (
      <>
        <BattleScreen
          key={activeNode.id}
          node={activeNode}
          runPlayer={runPlayer}
          meta={meta}
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
