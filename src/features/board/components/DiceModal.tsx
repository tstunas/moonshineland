"use client";

import { useState } from "react";

import { toast } from "sonner";

const QUICK_RANGES: ReadonlyArray<{ min: number; max: number }> = [
  { min: 0, max: 9 },
  { min: 1, max: 9 },
  { min: 0, max: 100 },
  { min: 1, max: 100 },
  { min: 0, max: 10 },
  { min: 1, max: 10 },
];

interface DiceModalProps {
  onClose: () => void;
  onInsert: (text: string) => void;
}

export function DiceModal({ onClose, onInsert }: DiceModalProps) {
  const [mode, setMode] = useState<"range" | "ndn">("range");
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(9);
  const [diceCount, setDiceCount] = useState(1);
  const [diceFaces, setDiceFaces] = useState(6);
  const [diceModifier, setDiceModifier] = useState(0);
  const [generated, setGenerated] = useState("");

  function handleGenerate() {
    if (mode === "range") {
      setGenerated(`.dice ${rangeMin} ${rangeMax}.`);
    } else {
      const modPart =
        diceModifier > 0
          ? `+${diceModifier}`
          : diceModifier < 0
            ? `${diceModifier}`
            : "";
      setGenerated(`[${diceCount}d${diceFaces}${modPart}]`);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      toast.success("복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-sky-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">🎲 주사위 텍스트</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-1.5">
          {(["range", "ndn"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded border px-3 py-1.5 text-sm font-semibold transition-colors ${
                mode === m
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-sky-200 bg-white text-slate-700 hover:bg-sky-50"
              }`}
            >
              {m === "range" ? "범위 (.dice.)" : "주사위 ([NdM])"}
            </button>
          ))}
        </div>

        {mode === "range" ? (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-sm text-slate-600">최솟값</label>
              <input
                type="number"
                value={rangeMin}
                onChange={(e) => setRangeMin(Number(e.target.value))}
                className="h-9 w-full rounded border border-sky-200 px-2 text-sm"
              />
              <label className="shrink-0 text-sm text-slate-600">최댓값</label>
              <input
                type="number"
                value={rangeMax}
                onChange={(e) => setRangeMax(Number(e.target.value))}
                className="h-9 w-full rounded border border-sky-200 px-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RANGES.map((r) => (
                <button
                  key={`${r.min}-${r.max}`}
                  type="button"
                  onClick={() => {
                    setRangeMin(r.min);
                    setRangeMax(r.max);
                  }}
                  className="rounded border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  {r.min}~{r.max}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">굴릴 개수</label>
                <input
                  type="number"
                  min={1}
                  value={diceCount}
                  onChange={(e) => setDiceCount(Math.max(1, Number(e.target.value)))}
                  className="h-9 rounded border border-sky-200 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">주사위 눈 수</label>
                <input
                  type="number"
                  min={2}
                  value={diceFaces}
                  onChange={(e) => setDiceFaces(Math.max(2, Number(e.target.value)))}
                  className="h-9 rounded border border-sky-200 px-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">보정값</label>
                <input
                  type="number"
                  value={diceModifier}
                  onChange={(e) => setDiceModifier(Number(e.target.value))}
                  className="h-9 rounded border border-sky-200 px-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          className="mb-3 w-full rounded bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-600"
        >
          생성
        </button>

        {generated && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <code className="flex-1 break-all font-mono text-sm text-emerald-800">
              {generated}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              title="클립보드에 복사"
            >
              복사
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert(generated);
                onClose();
              }}
              className="shrink-0 rounded border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              title="내용 입력칸에 삽입"
            >
              삽입
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
