import { mediaArtworkSrc } from "./media-session.service";

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
