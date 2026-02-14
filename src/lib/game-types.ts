export const GAME_TYPES = [
  {
    id: "penalty_shootout",
    name: "Penalty Shootout Quiz",
    description: "Multiple choice questions — score goals with correct answers!",
    icon: "⚽",
    partyMode: false,
  },
  {
    id: "quickfire_duel",
    name: "Quickfire Duel",
    description: "Type your answer fast — first correct wins double points!",
    icon: "⚡",
    partyMode: false,
  },
  {
    id: "who_am_i",
    name: "Who Am I?",
    description: "One player gives clues, others guess the footballer!",
    icon: "🎭",
    partyMode: true,
  },
  {
    id: "career_path",
    name: "Career Path Challenge",
    description: "Clues revealed one by one — buzz in to guess the player!",
    icon: "🛤️",
    partyMode: false,
  },
  {
    id: "last_man_standing",
    name: "Last Man Standing",
    description: "Take turns naming answers — last player standing wins!",
    icon: "🏆",
    partyMode: false,
  },
  {
    id: "higher_or_lower",
    name: "Higher or Lower",
    description: "Compare stats — is it higher or lower?",
    icon: "📊",
    partyMode: false,
  },
  {
    id: "you_are_the_ref",
    name: "You Are The Ref",
    description: "Make the right call on tricky scenarios!",
    icon: "🟨",
    partyMode: false,
  },
  {
    id: "football_word_game",
    name: "Football Word Game",
    description: "Wordle-style — guess the footballer in 5 tries!",
    icon: "🔤",
    partyMode: true,
  },
] as const;

export type GameTypeId = (typeof GAME_TYPES)[number]["id"];
