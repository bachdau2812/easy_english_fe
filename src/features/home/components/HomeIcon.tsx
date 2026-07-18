interface HomeIconProps {
  name:
    | "bell"
    | "book"
    | "bookmark"
    | "brain"
    | "chart"
    | "check"
    | "chevron"
    | "close"
    | "dialogue"
    | "globe"
    | "grammar"
    | "headphones"
    | "login"
    | "mail"
    | "mic"
    | "pen"
    | "play"
    | "playlist"
    | "quiz"
    | "reading"
    | "search"
    | "spell"
    | "star"
    | "user"
    | "volume"
    | "waveform";
  size?: number;
}

export const HomeIcon = ({ name, size = 22 }: HomeIconProps) => {
  const commonProps = {
    "aria-hidden": true,
    className: "home-icon",
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: size
  };

  const paths: Record<HomeIconProps["name"], JSX.Element> = {
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v16H6.8A2.8 2.8 0 0 0 4 21.8" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </>
    ),
    bookmark: (
      <>
        <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
      </>
    ),
    brain: (
      <>
        <path d="M8 4.5a3 3 0 0 0-3 3v.2A3.5 3.5 0 0 0 5 14v1a3 3 0 0 0 5.6 1.5" />
        <path d="M16 4.5a3 3 0 0 1 3 3v.2A3.5 3.5 0 0 1 19 14v1a3 3 0 0 1-5.6 1.5" />
        <path d="M12 5v14" />
        <path d="M8 9h2" />
        <path d="M14 9h2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 3 5-7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    dialogue: (
      <>
        <path d="M7 8h7" />
        <path d="M7 12h4" />
        <path d="M5 18 3 21V6a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v6" />
        <path d="M16 14h3a2 2 0 0 1 2 2v5l-2-2h-3a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2Z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    grammar: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h10" />
        <path d="M4 18h7" />
        <path d="m16 16 2 2 4-5" />
      </>
    ),
    headphones: (
      <>
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <path d="M5 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" />
        <path d="M19 14h-3v6h3a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" />
      </>
    ),
    login: (
      <>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <path d="m10 17 5-5-5-5" />
        <path d="M15 12H3" />
      </>
    ),
    mail: (
      <>
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <path d="m22 7-10 7L2 7" />
      </>
    ),
    mic: (
      <>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        <path d="M8 21h8" />
      </>
    ),
    pen: (
      <>
        <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
        <path d="m14 6 4 4" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4V8Z" />
      </>
    ),
    playlist: (
      <>
        <path d="M4 6h11" />
        <path d="M4 12h9" />
        <path d="M4 18h7" />
        <path d="m16 15 5 3-5 3v-6Z" />
      </>
    ),
    quiz: (
      <>
        <path d="M9 9a3 3 0 1 1 5.2 2c-.9.8-2.2 1.2-2.2 2.5" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
    reading: (
      <>
        <path d="M12 6v13" />
        <path d="M4 5.5A7 7 0 0 1 12 6a7 7 0 0 1 8-.5V18a7 7 0 0 0-8 .5 7 7 0 0 0-8-.5Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    spell: (
      <>
        <path d="M5 19h14" />
        <path d="m7 15 5-10 5 10" />
        <path d="M9 11h6" />
      </>
    ),
    star: (
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    volume: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M16 9.5a4 4 0 0 1 0 5" />
        <path d="M18.5 7a8 8 0 0 1 0 10" />
      </>
    ),
    waveform: (
      <>
        <path d="M4 12h.01" />
        <path d="M8 8v8" />
        <path d="M12 5v14" />
        <path d="M16 9v6" />
        <path d="M20 11v2" />
      </>
    )
  };

  return <svg {...commonProps}>{paths[name]}</svg>;
};
