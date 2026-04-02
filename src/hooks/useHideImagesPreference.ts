"use client";

import { useEffect, useState } from "react";

import { HIDE_IMAGES_DEFAULT, PREFS_HIDE_IMAGES } from "@/lib/preferences";

const HIDE_IMAGES_PREF_EVENT = "moonshineland:preferences:hide-images";

function readHideImagesPreference(): boolean {
  if (typeof window === "undefined") {
    return HIDE_IMAGES_DEFAULT;
  }

  const stored = window.localStorage.getItem(PREFS_HIDE_IMAGES);
  if (stored === null) {
    return HIDE_IMAGES_DEFAULT;
  }

  return stored !== "0";
}

function writeHideImagesPreference(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PREFS_HIDE_IMAGES, value ? "1" : "0");
  window.dispatchEvent(new Event(HIDE_IMAGES_PREF_EVENT));
}

export function useHideImagesPreference() {
  const [hideImages, setHideImagesState] = useState(readHideImagesPreference);

  useEffect(() => {
    const sync = () => {
      setHideImagesState(readHideImagesPreference());
    };

    window.addEventListener("storage", sync);
    window.addEventListener(HIDE_IMAGES_PREF_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(HIDE_IMAGES_PREF_EVENT, sync);
    };
  }, []);

  const setHideImages = (value: boolean) => {
    setHideImagesState(value);
    writeHideImagesPreference(value);
  };

  const toggleHideImages = () => {
    const next = !hideImages;
    setHideImages(next);
  };

  return {
    hideImages,
    setHideImages,
    toggleHideImages,
  };
}
