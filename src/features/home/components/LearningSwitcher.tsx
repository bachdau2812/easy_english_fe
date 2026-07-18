import { useState } from "react";
import { HomeIcon } from "./HomeIcon";

const switcherTiles = [
  {
    id: "vocab",
    icon: "book" as const,
    label: "Vocab",
    title: "Vocabulary that stays organized",
    description: "Save useful words, check meaning fast, and keep examples close."
  },
  {
    id: "listening",
    icon: "headphones" as const,
    label: "Listening",
    title: "Listening with real context",
    description: "Practice short audio, repeat useful phrases, and catch meaning faster."
  },
  {
    id: "daily-word",
    icon: "star" as const,
    label: "Daily word",
    title: "One small win every day",
    description: "Open the app and get a fresh word with context, audio, and translation."
  },
  {
    id: "spelling",
    icon: "spell" as const,
    label: "Spelling",
    title: "Train spelling with active recall",
    description: "Practice typing words from sound, hints, and sentence context."
  },
  {
    id: "statistic",
    icon: "chart" as const,
    label: "Statistic",
    title: "Progress that feels readable",
    description: "Track accuracy, weak words, and learning momentum without noisy charts."
  },
  {
    id: "grammar",
    icon: "grammar" as const,
    label: "Grammar",
    title: "Grammar made lighter",
    description: "Learn sentence patterns with quick examples instead of heavy rules."
  },
  {
    id: "speaking",
    icon: "user" as const,
    label: "Speaking",
    title: "Speak with more confidence",
    description: "Practice pronunciation, rhythm, and everyday responses at your pace."
  },
  {
    id: "socializing",
    icon: "globe" as const,
    label: "Socializing",
    title: "English for real conversations",
    description: "Pick up friendly phrases for chats, school, travel, and online life."
  },
  {
    id: "quiz",
    icon: "quiz" as const,
    label: "Quiz",
    title: "Fast quizzes for focused review",
    description: "Mix word meaning, missing letters, listening, and sentence blanks."
  }
];

export const LearningSwitcher = () => {
  const [activeId, setActiveId] = useState(switcherTiles[0].id);
  const activeTool = switcherTiles.find((tool) => tool.id === activeId) ?? switcherTiles[0];
  const gridTiles = [
    switcherTiles[0],
    switcherTiles[1],
    switcherTiles[3],
    switcherTiles[4],
    switcherTiles[5],
    switcherTiles[2],
    switcherTiles[6],
    switcherTiles[7],
    switcherTiles[8]
  ];

  return (
    <section className="learning-switcher" id="smart-tools">
      <div className="learning-switcher__grid" aria-label="Learning tools">
        {gridTiles.map((tile) => {
          const isActive = activeId === tile.id;

          return (
            <button
              aria-pressed={isActive}
              className={`learning-switcher__tile ${isActive ? "learning-switcher__tile--active" : ""}`}
              key={tile.id}
              onClick={() => setActiveId(tile.id)}
              type="button"
            >
              <HomeIcon name={tile.icon} size={42} />
              <span>{tile.label}</span>
            </button>
          );
        })}
      </div>

      <article className="learning-switcher__detail">
        <p>Selected tool</p>
        <h2>{activeTool.title}</h2>
        <span>{activeTool.description}</span>
      </article>
    </section>
  );
};
