import { CSSProperties, FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import englandLogo from "../../../assets/england.jfif";
import flyingAroundTheWorld from "../../../assets/flying-around-the-world.svg";
import vietnamLogo from "../../../assets/vietnam.avif";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { ROUTES } from "../../../shared/constants/routes";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { authApi } from "../../auth/api/authApi";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAutocomplete } from "../../search/hooks/useAutocomplete";
import { vocabularyApi } from "../../vocabulary/api/vocabularyApi";
import { Word } from "../../dictionary/types";
import { VocabularyExplorerMode } from "./HomeVocabularyExplorer";
import { HomeIcon } from "./HomeIcon";

interface HomeNavbarProps {
  compactTitle?: string;
  onAuthOpen: () => void;
  onHomeClick?: () => void;
  onLanguageChange: (languageCode: string) => void;
  onProfileOpen: () => void;
  onSearchSubmit: (text: string, languageCode: string) => void;
  onSuggestionSelect: (word: Word, languageCode: string) => void;
  onVocabularySelect: (mode: VocabularyExplorerMode) => void;
}

const languageOptions = [
  { code: "vi", flagSrc: vietnamLogo, label: "Vietnamese" },
  { code: "en", flagSrc: englandLogo, label: "English" }
];

type MegaKey = "listening" | "pronunciation" | "reading" | "vocabulary" | "writing";

const navItems: Array<{ href: string; key: MegaKey; label: string }> = [
  { href: "#vocabulary", key: "vocabulary", label: "Vocabulary" },
  { href: "#writing", key: "writing", label: "Writing" },
  { href: "#listening", key: "listening", label: "Listening" },
  { href: "#pronunciation", key: "pronunciation", label: "Pronunciation" },
  { href: "#reading", key: "reading", label: "Reading" }
];

const compactNavItems: Array<{
  icon: "book" | "headphones" | "pen" | "reading" | "volume";
  key: MegaKey;
  label: string;
}> = [
  { icon: "book", key: "vocabulary", label: "Vocabulary" },
  { icon: "pen", key: "writing", label: "Writing" },
  { icon: "headphones", key: "listening", label: "Listening" },
  { icon: "volume", key: "pronunciation", label: "Pronunciation" },
  { icon: "reading", key: "reading", label: "Reading" }
];

const megaCopy: Record<Exclude<MegaKey, "vocabulary">, Array<{ label: string; text: string }>> = {
  listening: [
    { label: "Listen and Type", text: "Audio challenges with focused replay." },
    { label: "Daily audio", text: "Short clips for building a listening habit." },
    { label: "Dictation drills", text: "Catch spelling, rhythm, and word endings." }
  ],
  reading: [
    { label: "IELTS Resource", text: "Browse IELTS reading sources by category." }
  ],
  pronunciation: [
    { label: "Coming Soon", text: "Pronunciation practice is being prepared." }
  ],
  writing: [
    { label: "IELTS Writing Task 1", text: "Charts, maps, processes, and visual reports." },
    { label: "IELTS Writing Task 2", text: "Essay prompts by topic and opinion type." }
  ]
};

type DropdownItem = {
  description: string;
  href?: string;
  icon: "book" | "bookmark" | "brain" | "chart";
  label: string;
  onClick?: () => void;
  to?: string;
};

export const HomeNavbar = ({
  compactTitle,
  onAuthOpen,
  onHomeClick,
  onLanguageChange,
  onProfileOpen,
  onSearchSubmit,
  onSuggestionSelect,
  onVocabularySelect
}: HomeNavbarProps) => {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { isAuthenticated, username } = auth;
  const accountRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const [megaAnchorX, setMegaAnchorX] = useState(260);
  const [isCompactTitleTucked, setIsCompactTitleTucked] = useState(false);
  const [language, setLanguage] = useState(languageOptions[0]);
  const [searchText, setSearchText] = useState("");
  const languageRef = useRef<HTMLDivElement>(null);
  const autocomplete = useAutocomplete(searchText);
  const searchHistory = useQuery({
    enabled: Boolean(isSearchOpen && auth.userId),
    queryKey: ["navbar", "search-history", auth.userId],
    queryFn: () => vocabularyApi.getSearchHistory({ userId: auth.userId as string, page: 0, limit: 8 })
  });
  const isRouteCompact = Boolean(compactTitle);

  useClickOutside(languageRef, () => setIsLanguageOpen(false));
  useClickOutside(accountRef, () => setIsAccountOpen(false));
  useClickOutside(searchRef, () => {
    setIsSearchOpen(false);
    setSearchText("");
  });

  const openMega = (key: MegaKey, element: HTMLElement) => {
    const navbarRect = navbarRef.current?.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();

    if (navbarRect) {
      const rawAnchorX = itemRect.left - navbarRect.left + itemRect.width / 2;
      const panelHalfWidth = Math.min(180, Math.max(140, (window.innerWidth - 32) / 2));
      const boundedAnchorX = Math.min(
        Math.max(rawAnchorX, panelHalfWidth + 8),
        navbarRect.width - panelHalfWidth - 8
      );

      setMegaAnchorX(boundedAnchorX);
    }

    setActiveMega(key);
  };

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!activeMega && !isCompactMenuOpen) {
      return;
    }

    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (!navbarRef.current?.contains(event.target as Node)) {
        setActiveMega(null);
        setIsCompactMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMega(null);
        setIsCompactMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeMega, isCompactMenuOpen]);

  useEffect(() => {
    if (!isRouteCompact) {
      setIsCompactTitleTucked(false);
      return;
    }

    let frameId = 0;

    const updateCompactTitle = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const navbar = navbarRef.current;
        const mainContent = navbar?.nextElementSibling;

        if (!navbar || !mainContent) {
          setIsCompactTitleTucked(false);
          return;
        }

        const navbarRect = navbar.getBoundingClientRect();
        const contentRect = mainContent.getBoundingClientRect();
        const isContentInNavbar = window.scrollY > 24 && contentRect.top <= navbarRect.bottom + 8;

        setIsCompactTitleTucked(isContentInNavbar);
      });
    };

    updateCompactTitle();
    window.addEventListener("scroll", updateCompactTitle, { passive: true });
    window.addEventListener("resize", updateCompactTitle);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateCompactTitle);
      window.removeEventListener("resize", updateCompactTitle);
    };
  }, [isRouteCompact]);

  const logout = useMutation({
    mutationFn: () =>
      auth.token ? authApi.logout({ token: auth.token }) : Promise.resolve("Already logged out"),
    onSettled: () => {
      auth.clearSession();
      queryClient.clear();
      setIsAccountOpen(false);
    }
  });

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedText = normalizeSearchText(searchText);

    if (!normalizedText) {
      return;
    }

    onSearchSubmit(normalizedText, language.code);
    setIsSearchOpen(false);
    setSearchText("");
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setActiveMega(null);
    setIsCompactMenuOpen(false);

    if (auth.userId) {
      void searchHistory.refetch();
    }
  };

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const isSmallViewport = window.matchMedia("(max-width: 760px)").matches;

    if (isSmallViewport && !isCompactMenuOpen) {
      event.preventDefault();
      setActiveMega(null);
      setIsSearchOpen(false);
      setIsCompactMenuOpen(true);
      return;
    }

    setIsCompactMenuOpen(false);
    onHomeClick?.();
  };

  const dropdownItems: DropdownItem[] = activeMega
    ? activeMega === "vocabulary"
      ? [
          {
            description: "Explore categories in a friendly grid.",
            icon: "book" as const,
            label: "Words by topic",
            onClick: () => onVocabularySelect("topics")
          },
          {
            description: "Browse A1 to C2 with paged word lists.",
            icon: "chart" as const,
            label: "Words by level",
            onClick: () => onVocabularySelect("levels")
          },
          {
            description: "Saved words, stats, and review entry points.",
            icon: "bookmark" as const,
            label: "My Vocabulary",
            onClick: () => onVocabularySelect("mine")
          }
        ]
      : megaCopy[activeMega].map((item, index) => ({
          description: item.text,
          href: `#${activeMega}`,
          icon: (index === 0 ? "book" : index === 1 ? "brain" : "chart") as "book" | "brain" | "chart",
          label: item.label,
          onClick:
            activeMega === "pronunciation"
              ? () => undefined
              : undefined,
          to:
            activeMega === "listening" && index === 0
              ? ROUTES.listenAndType
              : activeMega === "reading" && index === 0
                ? ROUTES.readingIelts
                : activeMega === "writing"
                  ? ROUTES.writingTask(index === 0 ? "1" : "2")
                  : undefined
        }))
    : [];

  const languagePicker = (
    <div className="guest-language" ref={languageRef}>
      <button
        aria-expanded={isLanguageOpen}
        aria-label="Choose language"
        className="guest-language__button"
        onClick={() => setIsLanguageOpen((current) => !current)}
        type="button"
      >
        <span className="guest-language__flag">
          <img alt="" src={language.flagSrc} />
          <HomeIcon name="globe" size={18} />
        </span>
      </button>
      {isLanguageOpen ? (
        <div className="guest-language__menu">
          {languageOptions.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                setLanguage(option);
                onLanguageChange(option.code);
                setIsLanguageOpen(false);
              }}
              type="button"
            >
              <span className="guest-language__flag">
                <img alt="" src={option.flagSrc} />
                <HomeIcon name="globe" size={16} />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const compactMenu = (
    <div className="guest-navbar__compact-menu" aria-label="Compact navigation">
      {compactNavItems.map((item) => (
        <div className="guest-navbar__compact-item" key={item.key}>
          <button className="guest-navbar__compact-icon" aria-label={item.label} type="button">
            <HomeIcon name={item.icon} size={21} />
          </button>
          <div className="guest-navbar__compact-submenu">
            <strong>{item.label}</strong>
            {item.key === "vocabulary" ? (
              <>
                <button
                  onClick={() => {
                    onVocabularySelect("topics");
                    setIsCompactMenuOpen(false);
                  }}
                  type="button"
                >
                  Words by topic
                </button>
                <button
                  onClick={() => {
                    onVocabularySelect("levels");
                    setIsCompactMenuOpen(false);
                  }}
                  type="button"
                >
                  Words by level
                </button>
                <button
                  onClick={() => {
                    onVocabularySelect("mine");
                    setIsCompactMenuOpen(false);
                  }}
                  type="button"
                >
                  My Vocabulary
                </button>
              </>
            ) : (
              megaCopy[item.key].map((subItem, index) =>
                item.key === "pronunciation" ? (
                  <button disabled key={subItem.label} type="button">
                    {subItem.label}
                  </button>
                ) : (
                  <Link
                    key={subItem.label}
                    onClick={() => setIsCompactMenuOpen(false)}
                    to={
                      item.key === "listening" && index === 0
                        ? ROUTES.listenAndType
                        : item.key === "reading" && index === 0
                          ? ROUTES.readingIelts
                          : item.key === "writing"
                            ? ROUTES.writingTask(index === 0 ? "1" : "2")
                            : `${ROUTES.home}#${item.key}`
                    }
                  >
                    <span>{subItem.label}</span>
                  </Link>
                )
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <header
      ref={navbarRef}
      className={`guest-navbar ${isSearchOpen ? "guest-navbar--searching" : ""} ${
        activeMega && !isSearchOpen && !isRouteCompact ? "guest-navbar--mega-open" : ""
      } ${isRouteCompact ? "guest-navbar--route-compact" : ""} ${
        isCompactTitleTucked ? "guest-navbar--title-tucked" : ""
      } ${isCompactMenuOpen ? "guest-navbar--compact-menu-open" : ""}`}
      onMouseLeave={() => {
        setActiveMega(null);
        setIsCompactMenuOpen(false);
      }}
    >
      <div
        className="guest-navbar__left"
        onMouseEnter={() => setIsCompactMenuOpen(true)}
        onMouseLeave={() => setIsCompactMenuOpen(false)}
      >
        <Link className="guest-navbar__logo" to={ROUTES.home} aria-label="Easy English home" onClick={handleLogoClick}>
          <span className="guest-navbar__logo-fallback" aria-hidden="true">E</span>
          <img alt="" src={flyingAroundTheWorld} />
        </Link>
        {isRouteCompact ? compactMenu : <div className="guest-navbar__mobile-compact-menu">{compactMenu}</div>}
      </div>

      <div className="guest-navbar__center">
        {isRouteCompact ? (
          <strong className="guest-navbar__route-title">{compactTitle}</strong>
        ) : (
          <>
            <nav className="guest-navbar__links" aria-label="Guest features">
              {navItems.map((item) => (
                <a
                  className={activeMega === item.key ? "guest-navbar__link--active" : ""}
                  href={item.href}
                  key={item.key}
                  onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                    event.preventDefault();
                    if (activeMega === item.key) {
                      setActiveMega(null);
                    } else {
                      openMega(item.key, event.currentTarget);
                    }
                  }}
                  onFocus={(event) => openMega(item.key, event.currentTarget)}
                  onMouseEnter={(event) => openMega(item.key, event.currentTarget)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <form className="guest-navbar__search" onSubmit={handleSearch} ref={searchRef}>
              <HomeIcon name="search" size={19} />
              <input
                aria-label="Search words"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search"
                ref={searchInputRef}
                value={searchText}
              />
              {isSearchOpen && searchText.trim() ? (
                <div className="guest-search-suggestions">
                  {autocomplete.isLoading ? <p>Looking for matches...</p> : null}
                  {autocomplete.error ? <p>{getSafeErrorMessage(autocomplete.error)}</p> : null}
                  {!autocomplete.isLoading && !autocomplete.error && (autocomplete.data ?? []).length === 0 ? (
                    <p>No suggestions yet.</p>
                  ) : null}
                  {!autocomplete.isLoading && !autocomplete.error
                    ? (autocomplete.data ?? []).slice(0, 7).map((word) => (
                        <button
                          key={word.id ?? word.word ?? word.normalizedWord}
                          onClick={() => {
                            onSuggestionSelect(word, language.code);
                            setSearchText("");
                            setIsSearchOpen(false);
                          }}
                          type="button"
                        >
                          <span>{word.word ?? word.normalizedWord ?? "Untitled word"}</span>
                          <small>{[word.pos, word.certLevel].filter(Boolean).join(" / ") || "Word"}</small>
                        </button>
                      ))
                    : null}
                </div>
              ) : null}
              {isSearchOpen && !searchText.trim() ? (
                <div className="guest-search-suggestions">
                  <strong className="guest-search-suggestions__title">Recent searches</strong>
                  {!isAuthenticated ? <p>Sign in to see your search history.</p> : null}
                  {isAuthenticated && searchHistory.isLoading ? <p>Loading search history...</p> : null}
                  {isAuthenticated && searchHistory.error ? <p>{getSafeErrorMessage(searchHistory.error)}</p> : null}
                  {isAuthenticated &&
                  !searchHistory.isLoading &&
                  !searchHistory.error &&
                  (searchHistory.data?.content ?? []).length === 0 ? (
                    <p>No search history yet.</p>
                  ) : null}
                  {isAuthenticated && !searchHistory.isLoading && !searchHistory.error
                    ? (searchHistory.data?.content ?? []).map((item) => (
                        <button
                          key={item.id ?? item.wordId ?? item.word}
                          onClick={() => {
                            const nextWord = item.word?.trim();

                            if (item.wordId) {
                              onSuggestionSelect({ id: item.wordId, word: nextWord ?? "Recent word" }, language.code);
                            } else if (nextWord) {
                              onSearchSubmit(normalizeSearchText(nextWord), language.code);
                            }

                            setSearchText("");
                            setIsSearchOpen(false);
                          }}
                          type="button"
                        >
                          <span>{item.word ?? "Recent word"}</span>
                          <small>History</small>
                        </button>
                      ))
                    : null}
                </div>
              ) : null}
            </form>
          </>
        )}
      </div>

      {isRouteCompact ? <div className="guest-navbar__right guest-navbar__right--compact" aria-hidden="true" /> : <div className="guest-navbar__right">
        {isSearchOpen ? (
          <button
            aria-label="Close search"
            className="guest-navbar__icon-button"
            onClick={() => setIsSearchOpen(false)}
            type="button"
          >
            <HomeIcon name="close" size={20} />
          </button>
        ) : (
          <button
            aria-label="Open search"
            className="guest-navbar__icon-button"
            onClick={openSearch}
            type="button"
          >
            <HomeIcon name="search" size={20} />
          </button>
        )}

        {languagePicker}

        <div className="guest-account" ref={accountRef}>
          <button
            className="guest-navbar__sign"
            onClick={isAuthenticated ? () => setIsAccountOpen((current) => !current) : onAuthOpen}
            type="button"
          >
            <HomeIcon name={isAuthenticated ? "user" : "login"} size={19} />
            <span>{isAuthenticated ? username ?? "Learner" : "Sign in"}</span>
          </button>
          {isAuthenticated && isAccountOpen ? (
            <div className="guest-account__menu">
              <button
                onClick={() => {
                  setIsAccountOpen(false);
                  onProfileOpen();
                }}
                type="button"
              >
                Change info
              </button>
              <button disabled={logout.isPending} onClick={() => logout.mutate()} type="button">
                {logout.isPending ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>}

      {activeMega && !isSearchOpen && !isRouteCompact ? (
        <div
          className={`guest-navbar__mega-panel guest-navbar__mega-panel--${activeMega}`}
          style={{ "--mega-anchor-x": `${megaAnchorX}px` } as CSSProperties}
          onMouseEnter={() => setActiveMega(activeMega)}
        >
          <div className="guest-navbar__mega-column">
            {dropdownItems.map((item) =>
              typeof item.onClick === "function" ? (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick?.();
                    setActiveMega(null);
                  }}
                  type="button"
                >
                  <span className="guest-navbar__mega-icon">
                    <HomeIcon name={item.icon} size={19} />
                  </span>
                  <span className="guest-navbar__mega-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <HomeIcon name="chevron" size={18} />
                </button>
              ) : item.to ? (
                <Link key={item.label} onClick={() => setActiveMega(null)} to={item.to}>
                  <span className="guest-navbar__mega-icon">
                    <HomeIcon name={item.icon} size={19} />
                  </span>
                  <span className="guest-navbar__mega-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <HomeIcon name="chevron" size={18} />
                </Link>
              ) : item.href ? (
                <a href={item.href} key={item.label} onClick={() => setActiveMega(null)}>
                  <span className="guest-navbar__mega-icon">
                    <HomeIcon name={item.icon} size={19} />
                  </span>
                  <span className="guest-navbar__mega-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <HomeIcon name="chevron" size={18} />
                </a>
              ) : (
                <button disabled key={item.label} type="button">
                  <span className="guest-navbar__mega-icon">
                    <HomeIcon name={item.icon} size={19} />
                  </span>
                  <span className="guest-navbar__mega-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
};
