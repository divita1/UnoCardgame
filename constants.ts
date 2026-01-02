
import { Card, CardColor, CardValue } from './types';

export const COLOR_MAP: Record<CardColor, string> = {
  [CardColor.RED]: 'bg-red-500 text-white border-red-300',
  [CardColor.GREEN]: 'bg-green-500 text-white border-green-300',
  [CardColor.BLUE]: 'bg-blue-500 text-white border-blue-300',
  [CardColor.YELLOW]: 'bg-yellow-400 text-black border-yellow-200',
  [CardColor.WILD]: 'bg-zinc-800 text-white border-zinc-500'
};

export const COLOR_HEX: Record<CardColor, string> = {
  [CardColor.RED]: '#ef4444',
  [CardColor.GREEN]: '#22c55e',
  [CardColor.BLUE]: '#3b82f6',
  [CardColor.YELLOW]: '#facc15',
  [CardColor.WILD]: '#27272a'
};

const createCard = (color: CardColor, value: CardValue): Card => ({
  id: `${color}-${value}-${Math.random().toString(36).substr(2, 9)}`,
  color,
  value
});

export const generateInitialDeck = (): Card[] => {
  const deck: Card[] = [];
  const colors = [CardColor.RED, CardColor.GREEN, CardColor.BLUE, CardColor.YELLOW];
  const numberValues = [
    CardValue.ZERO, CardValue.ONE, CardValue.TWO, CardValue.THREE, 
    CardValue.FOUR, CardValue.FIVE, CardValue.SIX, CardValue.SEVEN, 
    CardValue.EIGHT, CardValue.NINE
  ];
  const actionValues = [CardValue.SKIP, CardValue.REVERSE, CardValue.DRAW_TWO];

  colors.forEach(color => {
    // One 0 per color
    deck.push(createCard(color, CardValue.ZERO));
    // Two of each 1-9
    for (let i = 0; i < 2; i++) {
      numberValues.slice(1).forEach(val => deck.push(createCard(color, val)));
      actionValues.forEach(val => deck.push(createCard(color, val)));
    }
  });

  // 4 Wild and 4 Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push(createCard(CardColor.WILD, CardValue.WILD));
    deck.push(createCard(CardColor.WILD, CardValue.WILD_DRAW_FOUR));
  }

  return shuffle(deck);
};

export const shuffle = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
