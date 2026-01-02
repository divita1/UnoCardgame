
import { Card, CardColor, CardValue } from '../types';

export const isValidMove = (card: Card, topCard: Card, activeColor: CardColor): boolean => {
  // Wild cards can always be played (except some house rules, but we'll allow standard play)
  if (card.color === CardColor.WILD) return true;
  
  // Match by color
  if (card.color === activeColor) return true;
  
  // Match by value
  if (card.value === topCard.value) return true;
  
  return false;
};

export const canPlayAny = (hand: Card[], topCard: Card, activeColor: CardColor): boolean => {
  return hand.some(card => isValidMove(card, topCard, activeColor));
};
