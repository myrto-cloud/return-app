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

const GOLD = "#E8B84B";

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

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-0 placeholder:text-neutral-400";
const labelClass =
  "block text-[11px] font-medium uppercase tracking-widest text-neutral-500 mb-1.5";

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
    "Partner / co-parent"
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
      return { ...path, thirtySixMonthTotal, netMonthlyAfterChildcare };
    });
  }, [numericValues]);

  const pathWithHighestIncome = useMemo(() => {
    if (!paths.length) return null;
    return paths.reduce(
      (best, p) =>
        p.thirtySixMonthTotal > best.thirtySixMonthTotal ? p : best,
      paths[0]
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
        }),
      });
      if (!response.ok) throw new Error("Insight generation failed");
      const data = (await response.json()) as InsightResponse;
      setInsight(data.insight);
      if (chapter !== "First leave") setStep(4);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your insight."
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
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setReEntryLoading(false);
    }
  };

  const