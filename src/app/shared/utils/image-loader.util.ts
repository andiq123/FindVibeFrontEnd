import { signal } from "@angular/core";

export interface ImageLoaderOptions {
  timeout?: number;
  fallbackSrc?: string;
}

export function createImageLoader(
  initialSrc: string | null | undefined,
  options: ImageLoaderOptions = {},
) {
  const { timeout = 3000, fallbackSrc = "no_album_art.jpg" } = options;

  const imageLoading = signal(true);
  const imageError = signal(false);
  const imageSrc = signal(initialSrc || fallbackSrc);

  let timeoutId: number | null = null;

  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const onImageLoad = () => {
    clearTimer();
    imageLoading.set(false);
    imageError.set(false);
  };

  const onImageError = () => {
    clearTimer();
    imageLoading.set(false);
    imageError.set(true);

    if (imageSrc() !== fallbackSrc) {
      imageSrc.set(fallbackSrc);
    }
  };

  const onImageLoadStart = () => {
    clearTimer();
    timeoutId = window.setTimeout(() => {
      if (imageLoading()) {
        onImageError();
      }
    }, timeout);
  };

  const updateSrc = (newSrc: string | null | undefined) => {
    const src = newSrc || fallbackSrc;

    if (src !== imageSrc()) {
      imageLoading.set(true);
      imageError.set(false);
      imageSrc.set(src);
    }
  };

  const cleanup = () => {
    clearTimer();
  };

  return {
    imageLoading,
    imageError,
    imageSrc,
    onImageLoad,
    onImageError,
    onImageLoadStart,
    updateSrc,
    cleanup,
  };
}

export type ImageLoader = ReturnType<typeof createImageLoader>;
