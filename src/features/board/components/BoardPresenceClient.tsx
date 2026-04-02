"use client";

import { useEffect } from "react";

import {
  clearHeaderPresence,
  setHeaderPresence,
} from "@/components/layout/headerPresenceStore";
import { useBoardSse } from "@/hooks/useBoardSse";

interface BoardPresenceClientProps {
  boardKey: string;
}

export function BoardPresenceClient({ boardKey }: BoardPresenceClientProps) {
  const { userCount } = useBoardSse(boardKey);

  useEffect(() => {
    setHeaderPresence({
      scope: "board",
      count: userCount,
    });

    return () => {
      clearHeaderPresence("board");
    };
  }, [userCount]);

  return null;
}