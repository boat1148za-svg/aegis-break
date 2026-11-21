import type { PlayerActionStep, TurnPhase, TurnState } from './types';

export type TurnEvent =
  | { type: 'SELECT_UNIT'; unitId: string }
  | { type: 'SET_STEP'; step: PlayerActionStep }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'END_PLAYER_PHASE' }
  | { type: 'END_ENEMY_PHASE' };

export function createInitialTurnState(): TurnState {
  return {
    turnNumber: 1,
    phase: 'PLAYER_PHASE',
    actionStep: 'IDLE',
    selectedUnitId: null,
  };
}

export function transitionTurnState(
  state: TurnState,
  event: TurnEvent
): TurnState {
  switch (event.type) {
    case 'SELECT_UNIT':
      if (state.phase !== 'PLAYER_PHASE') return state;
      return {
        ...state,
        selectedUnitId: event.unitId,
        actionStep: 'UNIT_SELECTED',
      };

    case 'SET_STEP':
      return {
        ...state,
        actionStep: event.step,
      };

    case 'CANCEL_SELECTION':
      return {
        ...state,
        selectedUnitId: null,
        actionStep: 'IDLE',
      };

    case 'END_PLAYER_PHASE': {
      const nextPhase: TurnPhase = 'ENEMY_PHASE';
      return {
        ...state,
        phase: nextPhase,
        actionStep: 'IDLE',
        selectedUnitId: null,
      };
    }

    case 'END_ENEMY_PHASE': {
      const nextPhase: TurnPhase = 'PLAYER_PHASE';
      return {
        turnNumber: state.turnNumber + 1,
        phase: nextPhase,
        actionStep: 'IDLE',
        selectedUnitId: null,
      };
    }

    default:
      return state;
  }
}
