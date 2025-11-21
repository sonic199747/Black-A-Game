import { Card } from "@/features/game/engine/cards";
import { ImageSourcePropType } from "react-native";

const cardFaceImages = {
  "2C": require("../../../../assets/face/2C.png"),
  "2D": require("../../../../assets/face/2D.png"),
  "2H": require("../../../../assets/face/2H.png"),
  "2S": require("../../../../assets/face/2S.png"),

  "3C": require("../../../../assets/face/3C.png"),
  "3D": require("../../../../assets/face/3D.png"),
  "3H": require("../../../../assets/face/3H.png"),
  "3S": require("../../../../assets/face/3S.png"),

  "4C": require("../../../../assets/face/4C.png"),
  "4D": require("../../../../assets/face/4D.png"),
  "4H": require("../../../../assets/face/4H.png"),
  "4S": require("../../../../assets/face/4S.png"),

  "5C": require("../../../../assets/face/5C.png"),
  "5D": require("../../../../assets/face/5D.png"),
  "5H": require("../../../../assets/face/5H.png"),
  "5S": require("../../../../assets/face/5S.png"),

  "6C": require("../../../../assets/face/6C.png"),
  "6D": require("../../../../assets/face/6D.png"),
  "6H": require("../../../../assets/face/6H.png"),
  "6S": require("../../../../assets/face/6S.png"),

  "7C": require("../../../../assets/face/7C.png"),
  "7D": require("../../../../assets/face/7D.png"),
  "7H": require("../../../../assets/face/7H.png"),
  "7S": require("../../../../assets/face/7S.png"),

  "8C": require("../../../../assets/face/8C.png"),
  "8D": require("../../../../assets/face/8D.png"),
  "8H": require("../../../../assets/face/8H.png"),
  "8S": require("../../../../assets/face/8S.png"),

  "9C": require("../../../../assets/face/9C.png"),
  "9D": require("../../../../assets/face/9D.png"),
  "9H": require("../../../../assets/face/9H.png"),
  "9S": require("../../../../assets/face/9S.png"),

  AC: require("../../../../assets/face/AC.png"),
  AD: require("../../../../assets/face/AD.png"),
  AH: require("../../../../assets/face/AH.png"),
  AS: require("../../../../assets/face/AS.png"),

  JC: require("../../../../assets/face/JC.png"),
  JD: require("../../../../assets/face/JD.png"),
  JH: require("../../../../assets/face/JH.png"),
  JS: require("../../../../assets/face/JS.png"),

  KC: require("../../../../assets/face/KC.png"),
  KD: require("../../../../assets/face/KD.png"),
  KH: require("../../../../assets/face/KH.png"),
  KS: require("../../../../assets/face/KS.png"),

  QC: require("../../../../assets/face/QC.png"),
  QD: require("../../../../assets/face/QD.png"),
  QH: require("../../../../assets/face/QH.png"),
  QS: require("../../../../assets/face/QS.png"),

  TC: require("../../../../assets/face/TC.png"),
  TD: require("../../../../assets/face/TD.png"),
  TH: require("../../../../assets/face/TH.png"),
  TS: require("../../../../assets/face/TS.png"),

  joker: require("../../../../assets/face/joker.png"),
  Bjoker: require("../../../../assets/face/Bjoker.png"),
} as const;

type StandardSuit = Exclude<Card["suit"], "joker">;
type StandardRank = Exclude<Card["rank"], "SJ" | "BJ">;
type CardFaceKey = keyof typeof cardFaceImages;

const suitToSymbol: Record<StandardSuit, string> = {
  club: "C",
  diamond: "D",
  heart: "H",
  spade: "S",
};

const rankToSymbol: Record<StandardRank, string> = {
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "T",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
  "2": "2",
};

export function getCardImageSource(card: Card): ImageSourcePropType {
  // 大王 (Big Joker)
  if (card.rank === "BJ") {
    return cardFaceImages.Bjoker;
  }
  
  // 小王 (Small Joker)
  if (card.suit === "joker" || card.rank === "SJ") {
    return cardFaceImages.joker;
  }

  const rankCode = rankToSymbol[card.rank];
  const suitCode = suitToSymbol[card.suit];
  const lookupKey = `${rankCode}${suitCode}` as CardFaceKey;

  return cardFaceImages[lookupKey] ?? cardFaceImages.joker;
}
