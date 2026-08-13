import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReviewAudioUrl,
  getReviewPreloadUrls,
  ReviewAudioPool
} from "../src/features/review/reviewAudio.ts";

class FakeAudio {
  currentTime = 9;
  loadCount = 0;
  pauseCount = 0;
  playCount = 0;
  preload = "";
  readonly src: string;
  private readonly rejectPlay: boolean;

  constructor(src: string, rejectPlay = false) {
    this.src = src;
    this.rejectPlay = rejectPlay;
  }

  load() {
    this.loadCount += 1;
  }

  pause() {
    this.pauseCount += 1;
  }

  play() {
    this.playCount += 1;
    return this.rejectPlay ? Promise.reject(new Error("blocked")) : Promise.resolve();
  }
}

test("review audio normalizes Mochi paths and preserves absolute URLs", () => {
  assert.equal(
    buildReviewAudioUrl("clip.mp3"),
    "https://mochien-server.mochidemy.com/audios/question/clip.mp3"
  );
  assert.equal(buildReviewAudioUrl(" https://cdn.example/audio.mp3 "), "https://cdn.example/audio.mp3");
  assert.equal(buildReviewAudioUrl(""), null);
});

test("review audio preloads deduplicated current and next question sounds", () => {
  const urls = getReviewPreloadUrls([
    {
      exerciseType: "VOCAB_MEANING_TO_SOUND",
      correctAnswer: "1",
      metadata: { 0: "a.mp3", 1: "b.mp3", 2: "b.mp3" },
      sound: { mp3Url: "fallback.mp3" }
    },
    {
      exerciseType: "VOCAB_LISTEN_AND_TYPE_WORD",
      audioUrl: "listen.mp3"
    },
    {
      exerciseType: "VOCAB_WORD_TO_MEANING",
      sound: { mp3Url: "result.mp3" }
    }
  ]);

  assert.deepEqual(urls, [
    "https://mochien-server.mochidemy.com/audios/question/a.mp3",
    "https://mochien-server.mochidemy.com/audios/question/b.mp3",
    "https://mochien-server.mochidemy.com/audios/question/listen.mp3",
    "https://mochien-server.mochidemy.com/audios/question/result.mp3"
  ]);
});

test("review audio pool preloads once, reuses clips, pauses active audio, and evicts old clips", async () => {
  const created: FakeAudio[] = [];
  const pool = new ReviewAudioPool((url) => {
    const audio = new FakeAudio(url);
    created.push(audio);
    return audio;
  });

  pool.preload(["one.mp3", "two.mp3", "one.mp3"]);
  pool.preload(["one.mp3", "two.mp3"]);
  assert.equal(created.length, 2);
  assert.deepEqual(created.map((audio) => audio.loadCount), [1, 1]);

  assert.equal(await pool.play("one.mp3"), true);
  assert.equal(await pool.play("one.mp3"), true);
  assert.equal(created[0].playCount, 2);
  assert.equal(created[0].currentTime, 0);

  assert.equal(await pool.play("two.mp3"), true);
  assert.equal(created[0].pauseCount, 1);

  pool.preload(["two.mp3"]);
  assert.equal(created[0].pauseCount, 2);
});

test("review audio pool contains browser playback rejection", async () => {
  const pool = new ReviewAudioPool((url) => new FakeAudio(url, true));
  assert.equal(await pool.play("blocked.mp3"), false);
});
