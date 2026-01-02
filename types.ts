
export enum CardColor {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
  WILD = 'WILD'
}

export enum CardValue {
  ZERO = '0',
  ONE = '1',
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  SKIP = 'SKIP',
  REVERSE = 'REVERSE',
  DRAW_TWO = 'DRAW_TWO',
  WILD = 'WILD',
  WILD_DRAW_FOUR = 'WILD_DRAW_FOUR'
}

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export enum PlayerType {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  activeColor: CardColor;
  status: GameStatus;
  winner: Player | null;
  message: string;
  isThinking: boolean;
}
