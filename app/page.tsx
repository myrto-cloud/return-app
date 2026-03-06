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
type InsightResponse = { insight: string };

const GOLD = "#E8B84B";
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const inputClass = "w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-0 placeholder:text-neutral-400";
const labelClass = "block text-[11px] font-medium uppercase tracking-widest text-neutral-500 mb-1.5";

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentSalary, setCurrentSalary] = useState("");
  const [partnerIncome, setPartnerIncome] = useState("");
  const [childcareCost, setChildcareCost] = useState("");
  const [savingsRunwayMonths, setSavingsRunwayMonths] = useState("");
  const [employerFlexibility, setEmployerFlexibility] = useState<EmployerFlexibility>("High");
  const [chapter, setChapter] = useState<Chapter>("First leave");
  const [leaveTiming, setLeaveTiming] = useState<LeaveTiming>("Third trimester");
  const [familySituation, setFamilySituation] = useState<FamilySituation>("Partner / co-parent");
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

  const numericValues = useMemo(() => ({
    salary: Number(currentSalary) || 0,
    partner: Number(partnerIncome) || 0,
    childcare: Number(childcareCost) || 0,
    runway: Number(savingsRunwayMonths) || 0,
  }), [childcareCost, currentSalary, partnerIncome, savingsRunwayMonths]);

  const paths: PathResult[] = useMemo(() => {
    const { salary, partner, childcare } = numericValues;
    return [
      { key: "fullTime" as PathKey, label: "Full-Time", factor: 1 },
      { key: "reducedHours" as PathKey, label: "Reduced Hours", factor: 0.7 },
      { key: "freelance" as PathKey, label: "Freelance", factor: 0.75 },
    ].map((p) => {
      const annual = salary * p.factor;
      return {
        ...p,
        thirtySixMonthTotal: annual * 3,
        netMonthlyAfterChildcare: annual / 12 + partner / 12 - childcare,
      };
    });
  }, [numericValues]);

  const pathWithHighestIncome = useMemo(() =>
    paths.reduce((best, p) => p.thirtySixMonthTotal > best.thirtySixMonthTotal ? p : best, paths[0]),
    [paths]
  );

  const hasMinimumInputs = numericValues.salary > 0;

  const handleStartNewScenario = () => {
    setStep(1); setCurrentSalary(""); setPartnerIncome(""); setChildcareCost("");
    setSavingsRunwayMonths(""); setEmployerFlexibility("High"); setChapter("First leave");
    setLeaveTiming("Third trimester"); setFamilySituation("Partner / co-parent");
    setBiggestConcern(""); setWhatMattersMost(""); setInsight(null); setError(null);
    setWhatChanged(""); setWhatWishKnown(""); setReEntryInsight(null); setReEntryError(null);
  };

  const handleGenerateInsight = async () => {
    setStep(3); setIsLoadingInsight(true); setInsight(null); setError(null);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSalary: numericValues.salary, partnerIncome: numericValues.partner, childcareCost: numericValues.childcare, savingsRunwayMonths: numericValues.runway, employerFlexibility, chapter, leaveTiming, familySituation, biggestConcern, whatMattersMost, paths }),
      });
      if (!res.ok) throw new Error("Insight generation failed");
      const data = (await res.json()) as InsightResponse;
      setInsight(data.insight);
      if (chapter !== "First leave") setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleReEntryInsight = async () => {
    setStep(5); setReEntryLoading(true); setReEntryInsight(null); setReEntryError(null);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentSalary: numericValues.salary, partnerIncome: numericValues.partner, childcareCost: numericValues.childcare, savingsRunwayMonths: numericValues.runway, employerFlexibility, chapter, leaveTiming, familySituation, biggestConcern, whatMattersMost, paths, reEntry: true, whatChanged, whatWishKnown }),
      });
      if (!res.ok) throw new Error("Re-entry insight failed");
      const data = (await res.json()) as InsightResponse;
      setReEntryInsight(data.insight);
    } catch (err) {
      setReEntryError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setReEntryLoading(false);
    }
  };

  const renderInsightContent = (value: string) => {
    const lines = value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const renderInline = (text: string) =>
      text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
        const m = seg.match(/^\*\*([^*]+)\*\*$/);
        return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{seg}</span>;
      });
    const bullets = lines.slice(1).filter(l => /^[-*•]\s+/.test(l));
    return (
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-neutral-800">{renderInline(lines[0])}</p>
        {bullets.length > 0 && (
          <ul className="space-y-3 text-sm text-neutral-700">
            {bullets.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                <span>{renderInline(line.replace(/^[-*•]\s+/, ""))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const totalSteps = chapter === "First leave" ? 3 : 5;
  const stepDefs = [
    { label: "Situation" }, { label: "Paths" }, { label: "Clarity" },
    { label: "Round two" }, { label: "Memory" },
  ].slice(0, totalSteps);

  const pathCardStyles: Record<PathKey, { bg: string; badge: string; badgeText: string; numColor: string; textColor: string }> = {
    fullTime: { bg: "bg-black", badge: "text-black", badgeText: "Stability", numColor: "text-neutral-900", textColor: "text-neutral-500" },
    reducedHours: { bg: "bg-white border border-neutral-200", badge: "text-black", badgeText: "Space", numColor: "text-neutral-900", textColor: "text-neutral-500" },
    freelance: { bg: "bg-white border border-neutral-200", badge: "text-black", badgeText: "Autonomy", numColor: "text-neutral-900", textColor: "text-neutral-500" },
  };

  const InsightCard = ({ loading, err, content, onRetry }: { loading: boolean; err: string | null; content: string | null; onRetry: () => void }) => (
    <div className="rounded-2xl p-7 sm:p-9" style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-neutral-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200" style={{ borderTopColor: GOLD }} />
          <p>Inviting Claude into the conversation…</p>
        </div>
      )}
      {!loading && err && (
        <div className="space-y-3 text-sm text-red-600">
          <p>{err}</p>
          <button onClick={onRetry} className="text-xs text-neutral-600 underline-offset-4 hover:underline">Try again</button>
        </div>
      )}
      {!loading && !err && content && renderInsightContent(content)}
      {!loading && !err && !content && <p className="text-sm text-neutral-500">Generating your reflection…</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5F0] px-4 py-12 font-sans">
      <div className="mx-auto w-full max-w-3xl">

        {step === 1 ? (
          <header className="mb-10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-1">Return</p>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              AI career companion<br />for working mothers
            </h1>
          </header>
        ) : (
          <header className="mb-8 flex items-center justify-between">
            <button onClick={handleStartNewScenario} className="text-[11px] tracking-[0.3em] text-neutral-400 hover:text-neutral-600 transition">Return</button>
            <span className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border font-medium" style={{ color: GOLD, borderColor: GOLD }}>Journey-aware</span>
          </header>
        )}

        <div className="mb-10 flex items-center">
          {stepDefs.flatMap(({ label }, index) => {
            const stepNum = (index + 1) as 1 | 2 | 3 | 4 | 5;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            const elements: ReactNode[] = [
              <div key={`s${stepNum}`} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${isCompleted || isActive ? "text-white" : "border border-neutral-300 text-neutral-400"}`}
                  style={isCompleted || isActive ? { backgroundColor: isCompleted ? "#d4a843" : GOLD } : undefined}
                >
                  {isCompleted ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : <span>{String(stepNum).padStart(2, "0")}</span>}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${isActive ? "text-neutral-700" : "text-neutral-400"}`}>{label}</span>
              </div>
            ];
            if (index < totalSteps - 1) {
              elements.push(
                <div key={`c${stepNum}`} className="mb-4 h-px flex-1 mx-2 rounded-full" style={{ backgroundColor: step > stepNum ? "#d4a843" : "#e5e5e5" }} />
              );
            }
            return elements;
          })}
        </div>

        {step === 1 && (
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Start with your current reality</h2>
              <p className="mt-1.5 text-sm text-neutral-500 max-w-xl">Return looks at your earnings, childcare, and flexibility to map out the next 36 months across different paths.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Current annual salary</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">$</span>
                  <input type="number" min={0} value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="e.g. 95000" className={inputClass + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={labelClass + " flex justify-between"}>
                  <span>Partner income</span><span className="text-[10px] normal-case text-neutral-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">$</span>
                  <input type="number" min={0} value={partnerIncome} onChange={e => setPartnerIncome(e.target.value)} placeholder="e.g. 120000" className={inputClass + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Family situation</label>
                <select value={familySituation} onChange={e => setFamilySituation(e.target.value as FamilySituation)} className={inputClass}>
                  <option>Partner / co-parent</option>
                  <option>Single parent</option>
                  <option>Co-parenting (separated)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Monthly childcare cost</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">$</span>
                  <input type="number" min={0} value={childcareCost} onChange={e => setChildcareCost(e.target.value)} placeholder="e.g. 1800" className={inputClass + " pl-7"} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Savings runway</label>
                <div className="relative">
                  <input type="number" min={0} value={savingsRunwayMonths} onChange={e => setSavingsRunwayMonths(e.target.value)} placeholder="Months you could cover costs" className={inputClass + " pr-14"} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">months</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Employer flexibility</label>
                <select value={employerFlexibility} onChange={e => setEmployerFlexibility(e.target.value as EmployerFlexibility)} className={inputClass}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Where are you in your journey?</label>
                <select value={chapter} onChange={e => setChapter(e.target.value as Chapter)} className={inputClass}>
                  <option>First leave</option><option>Second leave</option><option>Third leave</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Where are you in your leave?</label>
                <select value={leaveTiming} onChange={e => setLeaveTiming(e.target.value as LeaveTiming)} className={inputClass}>
                  <option>Third trimester</option>
                  <option>6-8 weeks postpartum</option>
                  <option>4-5 months</option>
                  <option>12 months</option>
                  <option>24+ months</option>
                </select>
              </div>
            </div>
            <div className="border-t border-neutral-200 pt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>What's your biggest concern right now?</label>
                <textarea value={biggestConcern} onChange={e => setBiggestConcern(e.target.value)} placeholder="e.g. I'm worried about losing momentum in my career" rows={3} className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className={labelClass}>What matters most to you in this decision?</label>
                <textarea value={whatMattersMost} onChange={e => setWhatMattersMost(e.target.value)} placeholder="e.g. being present for my child but not losing myself" rows={3} className={inputClass + " resize-none"} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="max-w-xs text-xs text-neutral-400">Numbers stay on your device except when you ask for an insight. Return is not financial advice.</p>
              <button onClick={() => hasMinimumInputs && setStep(2)} disabled={!hasMinimumInputs}
                className="rounded-full px-6 py-3 text-xs font-semibold tracking-widest transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: hasMinimumInputs ? GOLD : "#d4d4d4", color: hasMinimumInputs ? "#1a1a1a" : "#888" }}>
                See my paths
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Compare your next 36 months</h2>
                <p className="mt-1 text-sm text-neutral-500">These projections use your current salary as a base. Partner income (if any) is included in net monthly after childcare.</p>
              </div>
              <button onClick={() => setStep(1)} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition underline-offset-4 hover:underline">Edit inputs</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {paths.map(path => {
                const s = pathCardStyles[path.key];
                const dark = path.key === "fullTime";
                return (
                  <article key={path.key} className={`flex flex-col justify-between rounded-2xl p-5 ${s.bg}`}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-neutral-900"}`}>{path.label}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${s.badge}`}
                          style={{ backgroundColor: "#E8B84B" }}>
                          {s.badgeText}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className={`text-[10px] uppercase tracking-widest font-medium ${s.textColor}`}>36-month total</p>
                          <p className={`mt-0.5 text-2xl font-bold tracking-tight ${s.numColor}`}>{currencyFormatter.format(path.thirtySixMonthTotal)}</p>
                        </div>
                        <div>
                          <p className={`text-[10px] uppercase tracking-widest font-medium ${s.textColor}`}>Net monthly after childcare</p>
                          <p className={`mt-0.5 text-base font-semibold ${s.numColor}`}>{currencyFormatter.format(path.netMonthlyAfterChildcare)}</p>
                        </div>
                      </div>
                    </div>
                    <p className={`mt-4 text-[11px] leading-relaxed ${s.textColor}`}>Assumes your salary adjusts to this path from now for the next three years.</p>
                  </article>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="max-w-xs text-xs text-neutral-500">Next, Return will reflect back trade-offs in plain language based on your situation.</p>
              <button onClick={handleGenerateInsight} className="rounded-full px-6 py-3 text-xs font-semibold tracking-widest transition hover:brightness-105" style={{ background: GOLD, color: "#1a1a1a" }}>
                Generate insight
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">A reflection on where you are now</h2>
                <p className="mt-1 text-sm text-neutral-500">This card blends your financial picture with the realities of childcare, flexibility, and the chapter you are in.</p>
              </div>
              <button onClick={() => setStep(2)} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition underline-offset-4 hover:underline">Back to paths</button>
            </div>
            <InsightCard loading={isLoadingInsight} err={error} content={insight} onRetry={handleGenerateInsight} />
            <div className="flex justify-center pt-2"><button onClick={handleStartNewScenario} className="text-sm text-neutral-400 hover:text-neutral-600 transition underline-offset-4 hover:underline">Start a new scenario</button></div>
          </section>
        )}

        {step === 4 && chapter !== "First leave" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-neutral-900">Back for round two</h2>
              <button onClick={() => setStep(3)} className="text-xs text-neutral-400 hover:text-neutral-700 transition underline-offset-4 hover:underline">Back to insight</button>
            </div>
            <div className="rounded-2xl bg-neutral-100 px-6 py-5 sm:px-8 sm:py-6">
              <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                Last time: {chapter} · Path: {pathWithHighestIncome.label} · Net: {currencyFormatter.format(pathWithHighestIncome.netMonthlyAfterChildcare)} · Load: Manageable
              </p>
              <div className="my-3 border-t border-neutral-200" />
              <p className="text-sm leading-relaxed text-neutral-700">
                You're back. Last time you chose {pathWithHighestIncome.label}. A lot has changed — childcare costs are higher, and you're navigating this with a toddler at home now. But you also have something you didn't have before: real data. Let's use that this time.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>What's changed since last time?</label>
                <textarea value={whatChanged} onChange={e => setWhatChanged(e.target.value)} placeholder="e.g. childcare is more expensive, I have a toddler now" rows={3} className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className={labelClass}>What do you wish you'd known?</label>
                <textarea value={whatWishKnown} onChange={e => setWhatWishKnown(e.target.value)} placeholder="e.g. how much the reduced-hours path would actually feel day to day" rows={3} className={inputClass + " resize-none"} />
              </div>
              <button onClick={handleReEntryInsight} disabled={reEntryLoading}
                className="w-full rounded-full py-3 text-xs font-semibold tracking-widest transition disabled:opacity-40"
                style={{ background: GOLD, color: "#1a1a1a" }}>
                {reEntryLoading ? "Thinking…" : "See what's different now"}
              </button>
            </div>
          </section>
        )}

        {step === 5 && chapter !== "First leave" && (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">What's different this time</h2>
                <p className="mt-1 text-sm text-neutral-500">A reflection on your second chapter, built from what you shared then and now.</p>
              </div>
              <button onClick={() => setStep(4)} className="shrink-0 text-xs text-neutral-400 hover:text-neutral-700 transition underline-offset-4 hover:underline">Back to round two</button>
            </div>
            <InsightCard loading={reEntryLoading} err={reEntryError} content={reEntryInsight} onRetry={handleReEntryInsight} />
            <div className="flex justify-center pt-2"><button onClick={handleStartNewScenario} className="text-sm text-neutral-400 hover:text-neutral-600 transition underline-offset-4 hover:underline">Start a new scenario</button></div>
          </section>
        )}

      </div>
    </div>
  );
}