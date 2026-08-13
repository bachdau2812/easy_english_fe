import type { VocabReviewQuizResponse } from "./types";

const MOCHI_AUDIO_PREFIX = "https://mochien-server.mochidemy.com/audios/question/";

export interface ReviewAudio {
  currentTime: number;
  preload: string;
  load(): void;
  pause(): void;
  play(): Promise<void> | void;
}

export type ReviewAudioFactory = (url: string) => ReviewAudio;

const firstText = (...values: Array<string | null | undefined>) =>
  values.find((value) => Boolean(value?.trim()))?.trim() ?? null;

const isSoundChoiceQuestion = (question: VocabReviewQuizResponse) =>
  question.exerciseType === "VOCAB_MEANING_TO_SOUND" ||
  question.exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND";

const getResultSoundUrl = (question: VocabReviewQuizResponse) => {
  const correctIndex = Number(question.correctAnswer);
  const correctChoice = Number.isFinite(correctIndex)
    ? question.metadata?.[correctIndex]
    : null;
  const exerciseSound = isSoundChoiceQuestion(question)
    ? firstText(correctChoice, question.audioUrl)
    : firstText(question.audioUrl);

  return firstText(exerciseSound, question.sound?.mp3Url, question.sound?.oggUrl);
};

export const buildReviewAudioUrl = (audioUrl?: string | null) => {
  const normalized = audioUrl?.trim();
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//i.test(normalized)
    ? normalized
    : `${MOCHI_AUDIO_PREFIX}${normalized}`;
};

const getQuestionAudioUrls = (question: VocabReviewQuizResponse) => {
  const sources: Array<string | null | undefined> = [];

  if (question.exerciseType === "VOCAB_LISTEN_AND_TYPE_WORD") {
    sources.push(question.audioUrl);
  }
  if (isSoundChoiceQuestion(question)) {
    sources.push(...Object.values(question.metadata ?? {}));
  }
  sources.push(getResultSoundUrl(question));

  return sources;
};

export const getReviewPreloadUrls = (
  questions: Array<VocabReviewQuizResponse | null | undefined>
) => Array.from(new Set(
  questions
    .flatMap((question) => question ? getQuestionAudioUrls(question) : [])
    .map(buildReviewAudioUrl)
    .filter((url): url is string => Boolean(url))
));

export class ReviewAudioPool {
  private activeAudio: ReviewAudio | null = null;
  private readonly audios = new Map<string, ReviewAudio>();
  private readonly createAudio: ReviewAudioFactory;

  constructor(createAudio: ReviewAudioFactory) {
    this.createAudio = createAudio;
  }

  preload(rawUrls: readonly string[]) {
    const urls = new Set(
      rawUrls
        .map(buildReviewAudioUrl)
        .filter((url): url is string => Boolean(url))
    );

    for (const [url, audio] of this.audios) {
      if (!urls.has(url)) {
        audio.pause();
        this.audios.delete(url);
        if (this.activeAudio === audio) {
          this.activeAudio = null;
        }
      }
    }

    for (const url of urls) {
      if (!this.audios.has(url)) {
        const audio = this.createAudio(url);
        audio.preload = "auto";
        audio.load();
        this.audios.set(url, audio);
      }
    }
  }

  async play(rawUrl?: string | null) {
    const url = buildReviewAudioUrl(rawUrl);
    if (!url) {
      return false;
    }

    let audio = this.audios.get(url);
    if (!audio) {
      audio = this.createAudio(url);
      audio.preload = "auto";
      audio.load();
      this.audios.set(url, audio);
    }

    if (this.activeAudio && this.activeAudio !== audio) {
      this.activeAudio.pause();
    }

    this.activeAudio = audio;
    audio.currentTime = 0;

    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.activeAudio?.pause();
    this.activeAudio = null;
  }

  clear() {
    for (const audio of this.audios.values()) {
      audio.pause();
    }
    this.audios.clear();
    this.activeAudio = null;
  }
}
