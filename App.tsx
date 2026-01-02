
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, CardColor, CardValue, GameState, Player, 
  PlayerType, GameStatus 
} from './types';
import { generateInitialDeck, shuffle } from './constants';
import { isValidMove, canPlayAny } from './utils/gameLogic';
import { getAIMove } from './services/geminiService';
import CardComponent from './components/CardComponent';

const App: React.FC = () => {
  const [game, setGame] = useState<GameState>({
    players: [],
    deck: [],
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    activeColor: CardColor.RED,
    status: GameStatus.LOBBY,
    winner: null,
    message: "Welcome to Gemini UNO!",
    isThinking: false
  });

  const [showColorPicker, setShowColorPicker] = useState<{card: Card, index: number} | null>(null);

  const initGame = () => {
    const fullDeck = generateInitialDeck();
    const players: Player[] = [
      { id: 'p1', name: 'You', type: PlayerType.HUMAN, hand: fullDeck.splice(0, 7) },
      { id: 'ai', name: 'Gemini Master', type: PlayerType.AI, hand: fullDeck.splice(0, 7) }
    ];

    let firstCard = fullDeck.pop()!;
    // Ensure first card isn't a special wild for simple start
    while (firstCard.color === CardColor.WILD) {
      fullDeck.unshift(firstCard);
      shuffle(fullDeck);
      firstCard = fullDeck.pop()!;
    }

    setGame({
      players,
      deck: fullDeck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      direction: 1,
      activeColor: firstCard.color,
      status: GameStatus.PLAYING,
      winner: null,
      message: "Game started! Your turn.",
      isThinking: false
    });
  };

  const drawCard = (playerIndex: number) => {
    if (game.status !== GameStatus.PLAYING) return;
    
    setGame(prev => {
      let currentDeck = [...prev.deck];
      let currentDiscard = [...prev.discardPile];
      
      if (currentDeck.length === 0) {
        if (currentDiscard.length <= 1) return prev;
        const top = currentDiscard.pop()!;
        currentDeck = shuffle(currentDiscard);
        currentDiscard = [top];
      }

      const card = currentDeck.pop()!;
      const newPlayers = [...prev.players];
      newPlayers[playerIndex].hand.push(card);

      return {
        ...prev,
        deck: currentDeck,
        discardPile: currentDiscard,
        players: newPlayers,
        message: `${newPlayers[playerIndex].name} drew a card.`
      };
    });

    // Automatically end turn if human drew and nothing is playable?
    // Standard rules: If you draw and can play it, you can. We'll just end turn for simplicity or let them play.
    // Let's check if the current player is AI - they will handle their logic after drawing.
    if (game.players[playerIndex].type === PlayerType.HUMAN) {
       // Human keeps turn to play if they want, but usually drawing ends it unless they play.
       // We'll add a "Pass" button when they draw.
    }
  };

  const nextTurn = (skip: boolean = false) => {
    setGame(prev => {
      const step = prev.direction * (skip ? 2 : 1);
      let nextIndex = (prev.currentPlayerIndex + step) % prev.players.length;
      if (nextIndex < 0) nextIndex += prev.players.length;

      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        isThinking: false
      };
    });
  };

  const handlePlayCard = (playerIndex: number, cardIndex: number, chosenColor?: CardColor) => {
    const player = game.players[playerIndex];
    const card = player.hand[cardIndex];

    if (!isValidMove(card, game.discardPile[game.discardPile.length - 1], game.activeColor)) return;

    setGame(prev => {
      const newPlayers = [...prev.players];
      newPlayers[playerIndex].hand.splice(cardIndex, 1);
      
      const newDiscard = [...prev.discardPile, card];
      const newActiveColor = card.color === CardColor.WILD ? (chosenColor || CardColor.RED) : card.color;
      
      let nextDirection = prev.direction;
      let shouldSkip = false;
      let drawCount = 0;

      if (card.value === CardValue.REVERSE) {
        // In 2 player UNO, reverse acts like a Skip
        if (prev.players.length === 2) shouldSkip = true;
        else nextDirection = (prev.direction * -1) as 1 | -1;
      }
      if (card.value === CardValue.SKIP) shouldSkip = true;
      if (card.value === CardValue.DRAW_TWO) {
        drawCount = 2;
        shouldSkip = true;
      }
      if (card.value === CardValue.WILD_DRAW_FOUR) {
        drawCount = 4;
        shouldSkip = true;
      }

      // Check win
      if (newPlayers[playerIndex].hand.length === 0) {
        return {
          ...prev,
          players: newPlayers,
          discardPile: newDiscard,
          activeColor: newActiveColor,
          status: GameStatus.FINISHED,
          winner: player,
          message: `${player.name} wins!`
        };
      }

      // Handle draws for the next player
      let finalDeck = [...prev.deck];
      let finalDiscard = newDiscard;
      const nextPlayerIdx = (prev.currentPlayerIndex + prev.direction) % prev.players.length;
      const wrapIdx = nextPlayerIdx < 0 ? nextPlayerIdx + prev.players.length : nextPlayerIdx;

      for (let i = 0; i < drawCount; i++) {
        if (finalDeck.length === 0) {
          const top = finalDiscard.pop()!;
          finalDeck = shuffle(finalDiscard);
          finalDiscard = [top];
        }
        const drawn = finalDeck.pop()!;
        newPlayers[wrapIdx].hand.push(drawn);
      }

      return {
        ...prev,
        players: newPlayers,
        discardPile: finalDiscard,
        deck: finalDeck,
        activeColor: newActiveColor,
        direction: nextDirection,
        message: `${player.name} played ${card.value} ${card.color === CardColor.WILD ? '(Wild)' : ''}`
      };
    });

    const isAction = [CardValue.SKIP, CardValue.DRAW_TWO, CardValue.WILD_DRAW_FOUR, CardValue.REVERSE].includes(card.value);
    nextTurn(isAction);
  };

  const handleAICore = useCallback(async () => {
    if (game.status !== GameStatus.PLAYING || game.isThinking) return;
    
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.type !== PlayerType.AI) return;

    setGame(prev => ({ ...prev, isThinking: true, message: "Gemini is thinking..." }));
    
    // Tiny delay for realism
    await new Promise(r => setTimeout(r, 1500));

    const topCard = game.discardPile[game.discardPile.length - 1];
    const opponentHandSize = game.players.find(p => p.type === PlayerType.HUMAN)?.hand.length || 0;
    
    const move = await getAIMove(currentPlayer.hand, topCard, game.activeColor, opponentHandSize);
    
    if (move.cardIndex === null) {
      drawCard(game.currentPlayerIndex);
      // After drawing, standard AI will just pass if it can't play the new card.
      // We'll just force a skip to the next turn to keep it snappy.
      nextTurn();
    } else {
      handlePlayCard(game.currentPlayerIndex, move.cardIndex, move.chosenColor);
    }
  }, [game]);

  useEffect(() => {
    if (game.status === GameStatus.PLAYING && game.players[game.currentPlayerIndex]?.type === PlayerType.AI) {
      handleAICore();
    }
  }, [game.currentPlayerIndex, game.status, handleAICore]);

  const onHumanCardClick = (index: number) => {
    if (game.status !== GameStatus.PLAYING || game.currentPlayerIndex !== 0) return;
    const card = game.players[0].hand[index];
    
    if (!isValidMove(card, game.discardPile[game.discardPile.length - 1], game.activeColor)) {
      setGame(prev => ({ ...prev, message: "Invalid move! Pick another card." }));
      return;
    }

    if (card.color === CardColor.WILD) {
      setShowColorPicker({ card, index });
    } else {
      handlePlayCard(0, index);
    }
  };

  const handlePickColor = (color: CardColor) => {
    if (showColorPicker) {
      handlePlayCard(0, showColorPicker.index, color);
      setShowColorPicker(null);
    }
  };

  if (game.status === GameStatus.LOBBY) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 drop-shadow-lg">
            GEMINI UNO
          </h1>
          <p className="text-xl text-slate-400 font-medium">Challenge the most advanced AI at the classic card game.</p>
          <button 
            onClick={initGame}
            className="px-12 py-4 bg-white text-slate-900 rounded-full font-bold text-2xl hover:bg-slate-200 transition-all transform hover:scale-110 active:scale-95 shadow-2xl"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  const humanPlayer = game.players[0];
  const aiPlayer = game.players[1];
  const topCard = game.discardPile[game.discardPile.length - 1];

  return (
    <div className="relative min-h-screen flex flex-col p-4 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
      
      {/* AI Player Hand */}
      <div className="h-48 flex flex-col items-center justify-center">
        <div className="text-slate-400 mb-2 font-semibold flex items-center gap-2">
          {aiPlayer.name} 
          {game.currentPlayerIndex === 1 && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-ping"></span>}
          <span className="bg-slate-700 px-2 py-0.5 rounded text-xs ml-2">{aiPlayer.hand.length} cards</span>
        </div>
        <div className="flex -space-x-12 perspective-1000">
          {aiPlayer.hand.map((_, i) => (
            <CardComponent key={i} card={{} as Card} isHidden={true} className="transform rotate-1" />
          ))}
        </div>
      </div>

      {/* Center Board */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Active Color Indicator */}
        <div className="absolute top-10 flex items-center space-x-4 bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
          <span className="text-sm font-bold opacity-70">ACTIVE COLOR:</span>
          <div className={`w-6 h-6 rounded-full shadow-inner border border-white/20 transition-colors duration-500`} style={{ backgroundColor: game.activeColor === CardColor.WILD ? '#fff' : game.activeColor.toLowerCase() }}></div>
          <span className="font-bold tracking-widest text-lg">{game.activeColor}</span>
        </div>

        <div className="flex items-center space-x-20">
          {/* Deck Pile */}
          <div 
            onClick={() => game.currentPlayerIndex === 0 && drawCard(0)}
            className={`
              relative w-24 h-36 bg-zinc-800 rounded-xl border-4 border-zinc-700 
              flex items-center justify-center cursor-pointer shadow-2xl group
              ${game.currentPlayerIndex === 0 ? 'hover:scale-105 active:scale-95' : 'opacity-50'}
            `}
          >
            <div className="text-zinc-600 font-bold text-sm group-hover:text-zinc-400 transition-colors">DRAW</div>
            <div className="absolute -top-1 -right-1 bg-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {game.deck.length}
            </div>
          </div>

          {/* Discard Pile */}
          <div className="relative w-32 h-48">
            {game.discardPile.slice(-3).map((card, i) => (
              <CardComponent 
                key={card.id} 
                card={card} 
                className={`absolute inset-0 transform transition-all duration-700 ${i === 2 ? 'scale-110 shadow-2xl z-10' : 'scale-95 opacity-40 rotate-' + (i * 12)}`} 
              />
            ))}
          </div>
        </div>

        {/* Message Banner */}
        <div className="mt-12 text-center h-8">
           <p className={`text-xl font-medium transition-all ${game.isThinking ? 'animate-pulse text-blue-400' : 'text-slate-300'}`}>
             {game.message}
           </p>
        </div>
      </div>

      {/* Human Player Hand */}
      <div className="h-64 flex flex-col items-center justify-end pb-8">
        <div className="text-slate-400 mb-4 font-semibold flex items-center gap-2">
           {humanPlayer.name} (You)
           {game.currentPlayerIndex === 0 && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-ping"></span>}
        </div>
        <div className="flex -space-x-10 overflow-x-auto max-w-full px-12 py-8 scrollbar-hide">
          {humanPlayer.hand.map((card, i) => (
            <CardComponent 
              key={card.id} 
              card={card} 
              onClick={() => onHumanCardClick(i)} 
              isPlayable={game.currentPlayerIndex === 0 && isValidMove(card, topCard, game.activeColor)}
            />
          ))}
        </div>
        
        {/* Optional Pass button if human has drawn and can't play */}
        {game.currentPlayerIndex === 0 && !canPlayAny(humanPlayer.hand, topCard, game.activeColor) && (
          <button 
            onClick={() => nextTurn()}
            className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm font-bold transition-all"
          >
            PASS TURN
          </button>
        )}
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="bg-slate-800 p-10 rounded-3xl border border-white/10 text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-8">Choose a Color</h2>
            <div className="grid grid-cols-2 gap-6">
              {[CardColor.RED, CardColor.GREEN, CardColor.BLUE, CardColor.YELLOW].map(color => (
                <button
                  key={color}
                  onClick={() => handlePickColor(color)}
                  className={`
                    w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold
                    transform hover:scale-110 transition-all shadow-lg
                    ${color === CardColor.RED && 'bg-red-500'}
                    ${color === CardColor.GREEN && 'bg-green-500'}
                    ${color === CardColor.BLUE && 'bg-blue-500'}
                    ${color === CardColor.YELLOW && 'bg-yellow-400 text-black'}
                  `}
                >
                  {color}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowColorPicker(null)}
              className="mt-8 text-slate-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Winner Modal */}
      {game.status === GameStatus.FINISHED && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center space-y-8 p-12 bg-slate-800 rounded-[3rem] border-2 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <div className="text-8xl mb-4">🏆</div>
            <h2 className="text-6xl font-black text-white">{game.winner?.name} WON!</h2>
            <p className="text-2xl text-slate-400">What a spectacular match.</p>
            <div className="pt-8">
              <button 
                onClick={() => setGame(prev => ({ ...prev, status: GameStatus.LOBBY }))}
                className="px-12 py-4 bg-white text-slate-900 rounded-full font-bold text-xl hover:bg-slate-200 transition-all"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help / UI Decorations */}
      <div className="absolute top-4 right-4 flex space-x-4">
          <div className="text-xs text-slate-500 uppercase tracking-tighter text-right">
             Gemini AI Engine: Connected<br/>
             Model: Flash 3 Preview
          </div>
      </div>

    </div>
  );
};

export default App;
