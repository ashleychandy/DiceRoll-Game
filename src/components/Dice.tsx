import React from "react";

interface Props {
  diceFace: number;
}
const Dice: React.FC<Props> = ({ diceFace }) => {
  return (
    <div className="dice-container">
      <div className={`dice face-${diceFace}`}>
        <div className="face-1">
          <div className="dot-container">
            <div className="dot"></div>
          </div>
        </div>
        <div className="face-3">
          <div className="dot-container">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="face-4">
          <div className="dot-container">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="face-2">
          <div className="dot-container">
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="face-5">
          <div className="dot-container">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
        <div className="face-6">
          <div className="dot-container">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dice;
