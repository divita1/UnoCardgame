
import React from 'react';
import { Card, CardColor, CardValue } from '../types';
import { COLOR_MAP } from '../constants';

interface CardProps {
  card: Card;
  onClick?: () => void;
  isHidden?: boolean;
  className?: string;
  isPlayable?: boolean;
}

const CardComponent: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  isHidden = false, 
  className = "",
  isPlayable = true
}) => {
  const baseClasses = `
    relative w-24 h-36 rounded-xl border-4 flex flex-col items-center justify-center 
    font-extrabold text-2xl cursor-pointer transition-all duration-300 transform 
    hover:-translate-y-4 hover:scale-105 active:scale-95 shadow-xl
    ${isHidden ? 'bg-zinc-900 border-zinc-700' : COLOR_MAP[card.color]}
    ${!isPlayable && !isHidden ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'}
    ${className}
  `;

  if (isHidden) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <div className="w-16 h-24 border-2 border-zinc-600 rounded-lg flex items-center justify-center rotate-12">
           <span className="text-zinc-600 text-sm">UNO</span>
        </div>
      </div>
    );
  }

  const renderValue = () => {
    switch (card.value) {
      case CardValue.SKIP: return "∅";
      case CardValue.REVERSE: return "⇅";
      case CardValue.DRAW_TWO: return "+2";
      case CardValue.WILD: return "W";
      case CardValue.WILD_DRAW_FOUR: return "+4";
      default: return card.value;
    }
  };

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Corner Values */}
      <div className="absolute top-1 left-2 text-xs">{renderValue()}</div>
      <div className="absolute bottom-1 right-2 text-xs rotate-180">{renderValue()}</div>
      
      {/* Center Value */}
      <div className="w-16 h-24 bg-white/20 rounded-[50%] flex items-center justify-center transform -rotate-12 border-2 border-white/30">
        <span className="text-4xl drop-shadow-lg transform rotate-12">{renderValue()}</span>
      </div>

      {card.color === CardColor.WILD && (
        <div className="absolute bottom-2 flex space-x-0.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
        </div>
      )}
    </div>
  );
};

export default CardComponent;
