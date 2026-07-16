import {
  mediaArtworkSrc,
  mediaPlaybackState,
} from "./media-session.service";
import { PlayerStatus } from "../../features/player/models/player.model";

describe("mediaArtworkSrc", () => {
  it("upgrades http and rejects placeholders", () => {
    expect(mediaArtworkSrc("http://cdn.example/a.jpg")).toBe(
      "https://cdn.example/a.jpg",
    );
    expect(mediaArtworkSrc("https://cdn.example/a.jpg")).toBe(
      "https://cdn.example/a.jpg",
    );
    expect(mediaArtworkSrc("")).toBe("");
    expect(mediaArtworkSrc("no_album_art.jpg")).toBe("");
  });
});

describe("mediaPlaybackState", () => {
  it("keeps Now Playing alive across track gaps", () => {
    expect(mediaPlaybackState(PlayerStatus.Playing)).toBe("playing");
    expect(mediaPlaybackState(PlayerStatus.Loading)).toBe("playing");
    expect(mediaPlaybackState(PlayerStatus.Ended)).toBe("playing");
    expect(mediaPlaybackState(PlayerStatus.Paused)).toBe("paused");
    expect(mediaPlaybackState(PlayerStatus.Stopped)).toBe("none");
    expect(mediaPlaybackState(PlayerStatus.Error)).toBe("none");
  });
});
