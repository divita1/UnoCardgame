
import { GoogleGenAI, Type } from "@google/genai";
import { Card, CardColor, CardValue } from '../types';

export interface AIMove {
  cardIndex: number | null; // null means draw
  chosenColor?: CardColor;
}

export const getAIMove = async (
  hand: Card[], 
  topCard: Card, 
  activeColor: CardColor,
  opponentCardCount: number
): Promise<AIMove> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are playing a game of UNO. 
    Current Hand: ${JSON.stringify(hand.map((c, i) => ({ index: i, color: c.color, value: c.value })))}
    Top Card on Discard Pile: ${JSON.stringify({ color: topCard.color, value: topCard.value })}
    Current Active Color: ${activeColor}
    Your Opponent has ${opponentCardCount} cards left.
    
    Rules:
    - You must play a card that matches the active color or the value of the top card.
    - Wild cards can always be played.
    - If you play a Wild card, you must choose a new active color.
    - If you have no playable cards, you must draw (return cardIndex: null).
    
    Goal: Try to win! Prioritize high-value cards or action cards if the opponent is low on cards.
    
    Return your move as a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cardIndex: {
              type: Type.NUMBER,
              description: "The index of the card in your hand to play, or null to draw."
            },
            chosenColor: {
              type: Type.STRING,
              enum: [CardColor.RED, CardColor.GREEN, CardColor.BLUE, CardColor.YELLOW],
              description: "The color you choose if you play a Wild card."
            }
          },
          required: ["cardIndex"]
        }
      }
    });

    const result = JSON.parse(response.text.trim()) as AIMove;
    
    // Safety check: Validate if the AI's chosen index is actually playable
    if (result.cardIndex !== null) {
      const card = hand[result.cardIndex];
      if (!card) return { cardIndex: null };
      
      // Basic local validation
      const { isValidMove } = await import('../utils/gameLogic');
      if (!isValidMove(card, topCard, activeColor)) {
        return { cardIndex: null };
      }
    }

    return result;
  } catch (error) {
    console.error("AI Move failed", error);
    // Fallback logic
    const { isValidMove } = await import('../utils/gameLogic');
    const playableIndex = hand.findIndex(c => isValidMove(c, topCard, activeColor));
    if (playableIndex !== -1) {
      const card = hand[playableIndex];
      const move: AIMove = { cardIndex: playableIndex };
      if (card.color === CardColor.WILD) {
         move.chosenColor = CardColor.RED; // Simple fallback
      }
      return move;
    }
    return { cardIndex: null };
  }
};
