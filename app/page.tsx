"use client";

import { type ReactNode, useMemo, useState } from "react";
type EmployerFlexibility = "High" | "Medium" | "Low";
type Chapter = "First leave" | "Second leave" | "Third leave";
type LeaveTiming =
  | "Third trimester"
  | "6-8 weeks postpartum"
  | "4-5 months"
  | "12 months"
  | "24+ months";

type FamilySituation =
  | "Partner / co-parent"
  | "Single parent"
  | "Co-parenting (separated)";

type PathKey = "fullTime" | "reducedHours" | "freelance";

type PathResult = {
  key: PathKey;
  label: string;
  factor: number;
  thirtySixMonthTotal: number;
  netMonthlyAfterChildcare: number;
};

type InsightResponse = {
  insight: string;
};

const GOLD = "#F3C11B";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const monthlyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [currentSalary, setCurrentSalary] = useState("");
  const [partnerIncome, setPartnerIncome] = useState("");
  const [childcareCost, setChildcareCost] = useState("");
  const [savingsRunwayMonths, setSavingsRunwayMonths] = useState("");
  const [employerFlexibility, setEmployerFlexibility] =
    useState<EmployerFlexibility>("High");
  const [chapter, setChapter] = useState<Chapter>("First leave");
  const [leaveTiming, setLeaveTiming] =
    useState<LeaveTiming>("Third trimester");
  const [familySituation, setFamilySituation] = useState<FamilySituation>(
    "Partner / co-parent",
  );
  const [biggestConcern, setBiggestConcern] = useState("");
  const [whatMattersMost, setWhatMattersMost] = useState("");

  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [whatChanged, setWhatChanged] = useState("");
  const [whatWishKnown, setWhatWishKnown] = useState("");
  const [reEntryInsight, setReEntryInsight] = useState<string | null>(null);
  const [reEntryLoading, setReEntryLoading] = useState(false);
  const [reEntryError, setReEntryError] = useState<string | null>(null);

  const numericValues = useMemo(() => {
    const salary = Number(currentSalary) || 0;
    const partner = Number(partnerIncome) || 0;
    const childcare = Number(childcareCost) || 0;
    const runway = Number(savingsRunwayMonths) || 0;

    return { salary, partner, childcare, runway };
  }, [childcareCost, currentSalary, partnerIncome, savingsRunwayMonths]);

  const paths: PathResult[] = useMemo(() => {
    const { salary, partner, childcare } = numericValues;

    const base: Array<{ key: PathKey; label: string; factor: number }> = [
      { key: "fullTime", label: "Full-Time", factor: 1 },
      { key: "reducedHours", label: "Reduced Hours", factor: 0.7 },
      { key: "freelance", label: "Freelance", factor: 0.75 },
    ];

    return base.map((path) => {
      const pathAnnual = salary * path.factor;
      const thirtySixMonthTotal = pathAnnual * 3;

      const pathMonthlyIncome = pathAnnual / 12;
      const partnerMonthlyIncome = partner / 12;
      const netMonthlyAfterChildcare =
        pathMonthlyIncome + partnerMonthlyIncome - childcare;

      return {
        ...path,
        thirtySixMonthTotal,
        netMonthlyAfterChildcare,
      };
    });
  }, [numericValues]);

  const pathWithHighestIncome = useMemo(() => {
    if (!paths.length) return null;
    return paths.reduce(
      (best, p) =>
        p.thirtySixMonthTotal > best.thirtySixMonthTotal ? p : best,
      paths[0],
    );
  }, [paths]);

  const hasMinimumInputs = numericValues.salary > 0;

  const handleStartNewScenario = () => {
    setStep(1);
    setCurrentSalary("");
    setPartnerIncome("");
    setChildcareCost("");
    setSavingsRunwayMonths("");
    setEmployerFlexibility("High");
    setChapter("First leave");
    setLeaveTiming("Third trimester");
    setFamilySituation("Partner / co-parent");
    setBiggestConcern("");
    setWhatMattersMost("");
    setInsight(null);
    setError(null);
    setWhatChanged("");
    setWhatWishKnown("");
    setReEntryInsight(null);
    setReEntryError(null);
  };

  const handleSeePaths = () => {
    if (!hasMinimumInputs) return;
    setStep(2);
  };

  const handleGenerateInsight = async () => {
    setStep(3);
    setIsLoadingInsight(true);
    setInsight(null);
    setError(null);

    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSalary: numericValues.salary,
          partnerIncome: numericValues.partner,
          childcareCost: numericValues.childcare,
          savingsRunwayMonths: numericValues.runway,
          employerFlexibility,
          chapter,
          leaveTiming,
          familySituation,
          biggestConcern,
          whatMattersMost,
          paths,
        }),
      });

      if (!response.ok) {
        throw new Error("Insight generation failed");
      }

      const data = (await response.json()) as InsightResponse;
      setInsight(data.insight);

      if (chapter !== "First leave") {
        setStep(4);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your insight.",
      );
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleReEntryInsight = async () => {
    setStep(5);
    setReEntryLoading(true);
    setReEntryInsight(null);
    setReEntryError(null);
    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSalary: numericValues.salary,
          partnerIncome: numericValues.partner,
          childcareCost: numericValues.childcare,
          savingsRunwayMonths: numericValues.runway,
          employerFlexibility,
          chapter,
          leaveTiming,
          familySituation,
          biggestConcern,
          whatMattersMost,
          paths,
          reEntry: true,
          whatChanged,
          whatWishKnown,
        }),
      });
      if (!response.ok) throw new Error("Re-entry insight failed");
      const data = (await response.json()) as InsightResponse;
      setReEntryInsight(data.insight);
    } catch (err) {
      setReEntryError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setReEntryLoading(false);
    }
  };

  const renderInsightContent = (value: string) => {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return null;

    const intro = lines[0];
    const bulletLines = lines.slice(1).filter((line) => /^[-*•]\s+/.test(line));

    const renderInline = (text: string) => {
      const segments = text.split(/(\*\*[^*]+\*\*)/g);

      return segments.map((segment, index) => {
        const match = segment.match(/^\*\*([^*]+)\*\*$/);
        if (match) {
          return <strong key={index}>{match[1]}</strong>;
        }

        return <span key={index}>{segment}</span>;
      });
    };

    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-black">
          {renderInline(intro)}
        </p>
        {bulletLines.length > 0 && (
          <ul className="mt-1 space-y-2 text-sm text-neutral-800">
            {bulletLines.map((line, index) => {
              const content = line.replace(/^[-*•]\s+/, "");
              return (
                <li key={index} className="flex gap-2">
                  <span
                    className="mt-[6px] h-[4px] w-[4px] rounded-full bg-neutral-400"
                    aria-hidden="true"
                  />
                  <span>{renderInline(content)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <main className="w-full max-w-5xl rounded-3xl border border-neutral-200 bg-[#FFFFFF] px-6 py-8 text-black sm:px-10 sm:py-12">
        <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-600">
              Return
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">
              AI career companion for working mothers
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span
              className="inline-flex h-7 items-center justify-center rounded-full border bg-neutral-50 px-3 text-[10px] font-medium uppercase tracking-[0.2em]"
              style={{ color: GOLD, borderColor: GOLD }}
            >
              Journey-aware
            </span>
          </div>
        </header>

        <div
          className="mb-8 flex flex-col gap-3"
          aria-label="Progress"
        >
          <div className="flex items-center">
            {(
              [
                { num: "01", label: "Situation" },
                { num: "02", label: "Paths" },
                { num: "03", label: "Clarity" },
                { num: "04", label: "Round two" },
                { num: "05", label: "Memory" },
              ] as const
            )
              .slice(0, chapter === "First leave" ? 3 : 5)
              .flatMap(({ num, label }, index) => {
                const stepNum = index + 1;
                const isCompleted = step > stepNum;
                const isActive = step === stepNum;
                const total = chapter === "First leave" ? 3 : 5;
                const connectorCompleted = step > stepNum;
                const elements: ReactNode[] = [
                  <div
                    key={`step-${stepNum}`}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        isCompleted
                          ? "text-white"
                          : isActive
                            ? "text-black"
                            : "border-2 border-neutral-300 bg-transparent text-neutral-400"
                      }`}
                      style={
                        isCompleted || isActive
                          ? { backgroundColor: GOLD }
                          : undefined
                      }
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isCompleted ? (
                        <svg
                          width="14"
                          height="10"
                          viewBox="0 0 14 10"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M1 5l4 4 8-8"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        num
                      )}
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-medium uppercase tracking-wider ${
                        isActive ? "text-black" : "text-neutral-500"
                      }`}
                    >
                      {label}
                    </span>
                  </div>,
                ];
                if (index < total - 1) {
                  elements.push(
                    <div
                      key={`connector-${stepNum}`}
                      className="h-[2px] min-w-[16px] flex-1 rounded-full bg-neutral-200"
                      style={{
                        backgroundColor: connectorCompleted
                          ? GOLD
                          : undefined,
                      }}
                      aria-hidden
                    />,
                  );
                }
                return elements;
              })}
          </div>
        </div>

        {step === 1 && (
          <section aria-label="Inputs" className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-black">
                Start with your current reality
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Return looks at your earnings, childcare, and flexibility to map
                out the next 36 months across different paths.
              </p>
            </div>

            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Your numbers
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Current annual salary
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(e.target.value)}
                    placeholder="e.g. 95000"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-8 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  <span>Partner income</span>
                  <span className="text-[10px] normal-case text-neutral-500">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={partnerIncome}
                    onChange={(e) => setPartnerIncome(e.target.value)}
                    placeholder="e.g. 120000"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-8 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Family situation
                </label>
                <select
                  value={familySituation}
                  onChange={(e) =>
                    setFamilySituation(e.target.value as FamilySituation)
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-4 pr-12 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50"
                >
                  <option value="Partner / co-parent">
                    Partner / co-parent
                  </option>
                  <option value="Single parent">Single parent</option>
                  <option value="Co-parenting (separated)">
                    Co-parenting (separated)
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Monthly childcare cost
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={childcareCost}
                    onChange={(e) => setChildcareCost(e.target.value)}
                    placeholder="e.g. 1800"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-8 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Savings runway
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={savingsRunwayMonths}
                    onChange={(e) => setSavingsRunwayMonths(e.target.value)}
                    placeholder="Months you could cover costs"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500">
                    months
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Employer flexibility
                </label>
                <select
                  value={employerFlexibility}
                  onChange={(e) =>
                    setEmployerFlexibility(
                      e.target.value as EmployerFlexibility,
                    )
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-4 pr-12 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Where are you in your journey?
                </label>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value as Chapter)}
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-4 pr-12 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50"
                >
                  <option value="First leave">First leave</option>
                  <option value="Second leave">Second leave</option>
                  <option value="Third leave">Third leave</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  Where are you in your leave?
                </label>
                <select
                  value={leaveTiming}
                  onChange={(e) =>
                    setLeaveTiming(e.target.value as LeaveTiming)
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-4 pr-12 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50"
                >
                  <option value="Third trimester">Third trimester</option>
                  <option value="6-8 weeks postpartum">
                    6-8 weeks postpartum
                  </option>
                  <option value="4-5 months">4-5 months</option>
                  <option value="12 months">12 months</option>
                  <option value="24+ months">24+ months</option>
                </select>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                Your headspace
              </p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                    What's your biggest concern right now?
                  </label>
                  <textarea
                    value={biggestConcern}
                    onChange={(e) => setBiggestConcern(e.target.value)}
                    placeholder="e.g. I'm worried about losing momentum in my career"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                    What matters most to you in this decision?
                  </label>
                  <textarea
                    value={whatMattersMost}
                    onChange={(e) => setWhatMattersMost(e.target.value)}
                    placeholder="e.g. being present for my child but not losing myself"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="max-w-sm text-xs text-neutral-600">
                Numbers stay on your device except when you ask for an insight.
                Return is not financial advice, but a thinking partner.
              </p>
              <button
                type="button"
                onClick={handleSeePaths}
                disabled={!hasMinimumInputs}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.24em] text-black transition disabled:cursor-not-allowed disabled:text-white"
                style={{
                  background: hasMinimumInputs ? GOLD : "#d4d4d4",
                }}
              >
                See my paths
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-label="Path comparison" className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-black">
                  Compare your next 36 months
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                  These projections use your current salary as a base. Partner
                  income (if any) is included in net monthly after childcare.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-600 underline-offset-4 hover:text-black hover:underline"
              >
                Edit inputs
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {paths.map((path) => (
                <article
                  key={path.key}
                  className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-black">
                        {path.label}
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]"
                        style={{
                          background: "rgba(243, 193, 27, 0.15)",
                          color: GOLD,
                        }}
                      >
                        {path.key === "fullTime"
                          ? "Stability"
                          : path.key === "reducedHours"
                            ? "Space"
                            : "Autonomy"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                          36-month total income
                        </p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-black">
                          {currencyFormatter.format(path.thirtySixMonthTotal)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                          Net monthly after childcare
                        </p>
                        <p className="mt-1 text-base text-black">
                          {monthlyFormatter.format(
                            path.netMonthlyAfterChildcare,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-neutral-600">
                    Assumes your salary adjusts to this path from now for the
                    next three years.
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="max-w-sm text-xs text-neutral-600">
                Next, Return will look at your numbers, flexibility, and current
                chapter to reflect back trade-offs in plain language.
              </p>
              <button
                type="button"
                onClick={handleGenerateInsight}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.24em] text-black transition hover:brightness-110"
                style={{ background: GOLD }}
              >
                Generate insight
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-label="Insight" className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-black">
                  A reflection on where you are now
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                  This card blends your financial picture with the realities of
                  childcare, flexibility, and the chapter you are in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-neutral-600 underline-offset-4 hover:text-black hover:underline"
              >
                Back to paths
              </button>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-7 sm:p-9">
              {isLoadingInsight && (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-neutral-600">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
                  <p>Inviting Claude into the conversation…</p>
                </div>
              )}

              {!isLoadingInsight && error && (
                <div className="space-y-3 text-sm text-red-600">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={handleGenerateInsight}
                    className="text-xs text-neutral-700 underline-offset-4 hover:text-black hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!isLoadingInsight &&
                !error &&
                insight &&
                renderInsightContent(insight)}

              {!isLoadingInsight && !error && !insight && (
                <p className="text-sm text-neutral-600">
                  When you are ready, go back to compare paths and ask Return to
                  generate a fresh insight for you.
                </p>
              )}

              {chapter === "First leave" && (
                <div className="mt-8 flex justify-center border-t border-neutral-100 pt-6">
                  <button
                    type="button"
                    onClick={handleStartNewScenario}
                    className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline"
                  >
                    Start a new scenario
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 4 && chapter !== "First leave" && pathWithHighestIncome && (
          <section aria-label="Re-entry" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-black">
                Back for round two
              </h2>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs text-neutral-600 underline-offset-4 hover:text-black hover:underline"
              >
                Back to insight
              </button>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-[#F5F5F5] px-6 py-5 sm:px-8 sm:py-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600">
                Last time: {chapter} | Path: {pathWithHighestIncome.label} | Net
                income:{" "}
                {monthlyFormatter.format(
                  pathWithHighestIncome.netMonthlyAfterChildcare,
                )}{" "}
                | Load: Manageable
              </p>
              <div className="my-4 border-t border-neutral-300" aria-hidden />
              <p className="text-sm leading-relaxed text-neutral-800">
                You're back. Last time you chose {pathWithHighestIncome.label}.
                A lot has changed — childcare costs are higher, and you're
                navigating this with a toddler at home now. But you also have
                something you didn't have before: real data. You know what the
                load actually felt like. You know what your employer's
                flexibility looks like in practice. Let's use that this time.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  What's changed since last time?
                </label>
                <textarea
                  value={whatChanged}
                  onChange={(e) => setWhatChanged(e.target.value)}
                  placeholder="e.g. childcare is more expensive, I have a toddler now"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-600">
                  What do you wish you'd known?
                </label>
                <textarea
                  value={whatWishKnown}
                  onChange={(e) => setWhatWishKnown(e.target.value)}
                  placeholder="e.g. how much the reduced-hours path would actually feel day to day"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none ring-0 transition focus:border-neutral-500 focus:bg-neutral-50 placeholder:text-neutral-400"
                />
              </div>
              <button
                type="button"
                onClick={handleReEntryInsight}
                disabled={reEntryLoading}
                className="inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-xs font-medium uppercase tracking-[0.24em] text-black transition disabled:cursor-not-allowed disabled:text-white"
                style={{
                  background: reEntryLoading ? "#d4d4d4" : GOLD,
                }}
              >
                {reEntryLoading ? "Thinking…" : "See what's different now"}
              </button>
            </div>
          </section>
        )}

        {step === 5 && chapter !== "First leave" && (
          <section aria-label="Memory" className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-black">
                  What's different this time
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                  A reflection on your second chapter, built from what you shared
                  then and now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs text-neutral-600 underline-offset-4 hover:text-black hover:underline"
              >
                Back to round two
              </button>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-7 sm:p-9">
              {reEntryLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-neutral-600">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
                  <p>Return is reflecting on what's different this time…</p>
                </div>
              )}

              {!reEntryLoading && reEntryError && (
                <div className="space-y-3 text-sm text-red-600">
                  <p>{reEntryError}</p>
                  <button
                    type="button"
                    onClick={handleReEntryInsight}
                    className="text-xs text-neutral-700 underline-offset-4 hover:text-black hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!reEntryLoading && !reEntryError && reEntryInsight && (
                <>{renderInsightContent(reEntryInsight)}</>
              )}

              {!reEntryLoading && !reEntryError && !reEntryInsight && (
                <p className="text-sm text-neutral-600">
                  Generating your reflection…
                </p>
              )}

              <div className="mt-8 flex justify-center border-t border-neutral-100 pt-6">
                <button
                  type="button"
                  onClick={handleStartNewScenario}
                  className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline"
                >
                  Start a new scenario
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 4 && chapter !== "First leave" && !pathWithHighestIncome && (
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">
              Add your salary on Screen 1 to see the re-entry conversation.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleStartNewScenario}
                className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-700 hover:underline"
              >
                Start a new scenario
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
