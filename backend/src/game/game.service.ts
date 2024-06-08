import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

const MAX_PLAYERS = 2;
const MIN_FIELD_SIZE = 2;
const MAX_FIELD_SIZE = 6;

export type GameId = string;
export type PlayerId = string;

type OpenedCell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 9 - diamond
type ClosedCell = null;

export interface Game {
  id: GameId;
  params: GameParams;
  field: OpenedCell[][];
  currentState: GameState;
}

export interface GameState {
  field: (ClosedCell | OpenedCell)[][];
  players: PlayerId[]; // first player in list have current turn
  count: { [key: PlayerId]: number };
  winner: PlayerId | null;
}

export interface GameParams {
  fieldWidth: number;
  fieldHeight: number;
  diamondsQuantity: number;
}

export interface Result<T> {
  result?: T;
  error?: string;
}

@Injectable()
export class GameService {
  // TODO: Move state to DB or some KV-store
  private games = new Map<GameId, Game>();

  newGame(params: GameParams): Result<GameId> {
    if (
      !Number.isInteger(params.fieldWidth) ||
      params.fieldWidth < MIN_FIELD_SIZE ||
      params.fieldWidth > MAX_FIELD_SIZE
    ) {
      return {
        error: `Field width must be an integer between ${MIN_FIELD_SIZE} and ${MAX_FIELD_SIZE}`,
      };
    }
    if (
      !Number.isInteger(params.fieldHeight) ||
      params.fieldHeight < MIN_FIELD_SIZE ||
      params.fieldHeight > MAX_FIELD_SIZE
    ) {
      return {
        error: `Field height must be an integer between ${MIN_FIELD_SIZE} and ${MAX_FIELD_SIZE}`,
      };
    }
    if (
      !Number.isInteger(params.diamondsQuantity) ||
      params.diamondsQuantity % 2 === 0 ||
      params.diamondsQuantity >= params.fieldWidth * params.fieldHeight
    ) {
      return {
        error: `Diamonds quantity must be an odd number and less than ${params.fieldWidth * params.fieldHeight}`,
      };
    }

    const field = this.generateGameField(params);

    const currentState: GameState = {
      field: Array.from({ length: params.fieldHeight }, () =>
        Array(params.fieldWidth).fill(null),
      ),
      players: [],
      count: {
        total: 0,
      },
      winner: null,
    };

    const game: Game = {
      id: uuidv4(),
      params,
      field,
      currentState,
    };

    this.games.set(game.id, game);

    return {
      result: game.id,
    };
  }

  getGame(id: GameId): Result<GameState> {
    const game = this.games.get(id);
    if (!game) {
      return { error: 'Game not found' };
    }

    return { result: game.currentState };
  }

  addPlayer(id: GameId, playerId: PlayerId): Result<GameState> {
    const game = this.games.get(id);
    if (!game) {
      return { error: 'Game not found' };
    }
    if (game.currentState.players.length === MAX_PLAYERS) {
      return { error: `Game is full, max players: ${MAX_PLAYERS}` };
    }
    if (game.currentState.players.includes(playerId)) {
      return { error: `Player ${playerId} already in game` };
    }

    game.currentState.players.push(playerId);
    game.currentState.count[playerId] = 0;

    return { result: game.currentState };
  }

  makeTurn(
    id: GameId,
    playerId: PlayerId,
    x: number,
    y: number,
  ): Result<GameState> {
    const game = this.games.get(id);

    if (!game) {
      return { error: 'Game not found' };
    }
    if (game.currentState.winner) {
      return { error: 'Game is already won' };
    }
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return { error: 'Cell coordinates must be integers' };
    }
    if (
      x < 0 ||
      x >= game.params.fieldWidth ||
      y < 0 ||
      y >= game.params.fieldHeight
    ) {
      return { error: `Invalid cell coordinates: (${x}, ${y})` };
    }
    if (!game.currentState.players.includes(playerId)) {
      return { error: `Player ${playerId} not found in game` };
    }
    if (game.currentState.players[0] !== playerId) {
      return { error: `It's not player ${playerId}'s turn` };
    }
    if (game.currentState.field[y][x] !== null) {
      return { error: `Cell (${x}, ${y}) is already opened` };
    }

    const opened = game.field[y][x];
    game.currentState.field[y][x] = opened;

    if (opened === 9) {
      game.currentState.count[playerId]++;
      game.currentState.count.total++;
      if (game.currentState.count.total === game.params.diamondsQuantity) {
        let maxCount = 0;
        let potentialWinner = null;
        for (const player of game.currentState.players) {
          if (game.currentState.count[player] > maxCount) {
            maxCount = game.currentState.count[player];
            potentialWinner = player;
          }
        }
        game.currentState.winner = potentialWinner;
      }
    } else {
      // pass turn to next player
      if (game.currentState.players[0] === playerId) {
        game.currentState.players.push(game.currentState.players.shift());
      }
    }

    return { result: game.currentState };
  }

  private generateGameField(params: GameParams): OpenedCell[][] {
    const { fieldWidth, fieldHeight, diamondsQuantity } = params;

    const field: OpenedCell[][] = Array.from({ length: fieldHeight }, () =>
      Array(fieldWidth).fill(0),
    );

    // Randomly place diamonds
    let diamondsPlaced = 0;
    while (diamondsPlaced < diamondsQuantity) {
      const x = Math.floor(Math.random() * fieldWidth);
      const y = Math.floor(Math.random() * fieldHeight);
      if (field[y][x] !== 9) {
        field[y][x] = 9;
        diamondsPlaced++;
      }
    }

    // Calculate numbers for cells without diamonds
    for (let y = 0; y < fieldHeight; y++) {
      for (let x = 0; x < fieldWidth; x++) {
        if (field[y][x] === 9) continue;
        let diamondCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx,
              ny = y + dy;
            if (
              nx >= 0 &&
              nx < fieldWidth &&
              ny >= 0 &&
              ny < fieldHeight &&
              field[ny][nx] === 9
            ) {
              diamondCount++;
            }
          }
        }
        field[y][x] = diamondCount as OpenedCell;
      }
    }

    return field;
  }
}
