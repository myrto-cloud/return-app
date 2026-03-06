import { NextRequest, NextResponse } from "next/server";

type EmployerFlexibility = "High" | "Medium" | "Low";
type Chapter = "First leave" | "Second leave" | "Third leave";
type LeaveTiming =
  | "Third trimester"
  | "6-8 weeks postpartum"
  | "4-5 months"
  | "12 months"
  | "24+ months";

type PathKey = "fullTime" | "reducedHours" | "freelance";

type PathResult = {
  key: PathKey;
  label: string;
  factor: number;
  thirtySixMonthTotal: number;
  netMonthlyAfterChildcare: number;
};

type FamilySituation =
  | "Partner / co-parent"
  | "Single parent"
  | "Co-parenting (separated)";

type InsightRequestBody = {
  currentSalary: number;
  partnerIncome: number;
  childcareCost: number;
  savingsRunwayMonths: number;
  employerFlexibility: EmployerFlexibility;
  chapter: Chapter;
  leaveTiming: LeaveTiming;
  familySituation?: FamilySituation;
  biggestConcern: string;
  whatMattersMost: string;
  paths: PathResult[];
  reEntry?: boolean;
  whatChanged?: string;
  whatWishKnown?: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key is not configured." },
      { status: 500 },
    );
  }

  let body: InsightRequestBody;

  try {
    body = (await req.json()) as InsightRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    currentSalary,
    partnerIncome,
    childcareCost,
    savingsRunwayMonths,
    employerFlexibility,
    chapter,
    leaveTiming,
    familySituation = "Partner / co-parent",
    biggestConcern,
    whatMattersMost,
    paths,
    reEntry,
    whatChanged = "",
    whatWishKnown = "",
  } = body;

  const pathWithHighestIncome =
    paths.length > 0
      ? paths.reduce(
          (best, p) =>
            p.thirtySixMonthTotal > best.thirtySixMonthTotal ? p : best,
          paths[0],
        )
      : null;

  try {
    if (reEntry && pathWithHighestIncome) {
      const reEntryPrompt = `
You are Return, a calm, practical AI career companion for working mothers. This is a **second-chapter re-entry conversation**. She used Return during her first leave; now she's back (e.g. second pregnancy) and the tool already "knows" her.

**Last time (from her earlier inputs):**
- Chapter: ${chapter}
- Stage: ${leaveTiming}
- Family situation: ${familySituation}
- Path with highest income: ${pathWithHighestIncome.label}
- That path's net monthly after childcare: $${pathWithHighestIncome.netMonthlyAfterChildcare.toLocaleString("en-US", { maximumFractionDigits: 0 })}
- Her numbers then: salary $${currentSalary.toLocaleString("en-US", { maximumFractionDigits: 0 })}, partner $${partnerIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}, childcare $${childcareCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo, flexibility ${employerFlexibility}
- Emotionally she shared: biggest concern "${biggestConcern || "not specified"}", what mattered most "${whatMattersMost || "not specified"}"

**This time she is telling you:**
- What's changed since last time: "${whatChanged || "not specified"}"
- What she wishes she'd known: "${whatWishKnown || "not specified"}"

Respond explicitly as a second-chapter conversation. Acknowledge that she's back, that you're building on what she shared last time, and that her new reflections (what's changed, what she wishes she'd known) inform how you're reflecting now. Weave in the "last time" context and her new inputs; do not sound like a generic calculator — sound like a thinking partner who remembers her and is reflecting on what's different now.

Use this structure (simple Markdown):
- First, one short opening sentence on its own line that acknowledges this is round two and directly references what she said changed or what she wishes she'd known (warm and specific).
- Then 3–4 bullet points. Each bullet: start with a bolded label (e.g. **What's different now**: ...), highlight a key insight or trade-off, and bold important numbers or concepts.

Keep the tone warm, grounded, and non-prescriptive. Help her see what's different this time without telling her what to choose.
`;

      const reEntryResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 450,
            temperature: 0.7,
            messages: [{ role: "user", content: reEntryPrompt }],
          }),
        },
      );

      if (!reEntryResponse.ok) {
        const errorText = await reEntryResponse.text();
        console.error("Anthropic API error:", errorText);
        return NextResponse.json(
          { error: "Failed to generate re-entry insight." },
          { status: 500 },
        );
      }

      const reEntryJson = (await reEntryResponse.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const reEntryText =
        reEntryJson.content?.find((c) => c.type === "text")?.text ??
        "I wasn't able to reflect on what's different just now. Try again in a moment.";

      return NextResponse.json({ insight: reEntryText });
    }

    const prompt = `
You are Return, a calm, practical AI career companion for working mothers.

The user has shared:
- Current annual salary: $${currentSalary.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}
- Partner income: $${partnerIncome.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}
- Monthly childcare cost: $${childcareCost.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}
- Savings runway: ${savingsRunwayMonths.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })} months
- Employer flexibility: ${employerFlexibility}
- Chapter: ${chapter}
- Family situation: ${familySituation}

Emotionally, she described:
- Biggest concern: "${biggestConcern || "not specified"}"
- What matters most: "${whatMattersMost || "not specified"}"

Three paths have been modelled over 36 months:
${paths
  .map(
    (path) =>
      `- ${path.label}: 36-month total income $${path.thirtySixMonthTotal.toLocaleString(
        "en-US",
        { maximumFractionDigits: 0 },
      )}, estimated net monthly after childcare ${path.netMonthlyAfterChildcare.toLocaleString(
        "en-US",
        { maximumFractionDigits: 0 },
      )}`,
  )
  .join("\n")}

She is currently in the "${leaveTiming}" stage of this leave.
If she selected "First leave", remember this is her first time navigating parental leave and she may be setting intentions for how work, income, and care will fit together.

Factor in her family situation:
- If she selected "Single parent", explicitly acknowledge that she is navigating this without a financial or logistical co-pilot. In your analysis, treat savings runway and childcare cost as carrying more weight — they are more decisive for her than for someone with a partner's income or shared logistics. Reflect that in your bullet points and tone.
- If she selected "Co-parenting (separated)", acknowledge that finances and logistics may be split or more constrained; runway and childcare still matter heavily.
- If "Partner / co-parent", no special weighting is required; partner income is already in the numbers.

Please respond in this exact structure, using simple Markdown:
- First, a single short opening sentence on its own line that directly and specifically acknowledges what she shared emotionally (her biggest concern and what matters most) and where she is in her leave (chapter and timing), before you touch the numbers.
- Then, 3–4 bullet points. Each bullet should:
  - Start with a short bolded label, like: - **Income stability**: ...
  - Highlight one key insight or trade-off.
  - Bold especially important numbers or concepts (for example **$X**, **36 months**, **savings runway**, **net monthly after childcare**).

Tune your tone and focus based on timing:
- If she is in the third trimester, be forward-looking and planning-oriented, assuming this is a relatively clear-headed moment to map paths.
- If she is 6-8 weeks postpartum, be extremely gentle and fog-aware, validate that this is one of the hardest moments, and avoid overwhelming detail while still naming key signals.
- If she is 4-5 months postpartum, treat this as a decision-urgent moment: model the trade-offs clearly and concretely so she can feel the real shape of each path.
- If she is around 12 months, treat this as a check-in: reflect on how the current or chosen path seems to be performing against expectations.
- If she is 24+ months out, treat this as a reassessment moment: look at the full arc so far and how her needs or priorities may have shifted.

Make the bullets concise and scannable. Do not add any extra sections, headings, or closing paragraphs outside this structure.

Keep the tone warm, grounded, and non-prescriptive. Avoid telling her what to choose; instead, help her see the shape of her options in this chapter and timing.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate insight." },
        { status: 500 },
      );
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text =
      json.content?.find((c) => c.type === "text")?.text ??
      "I was unable to generate a detailed reflection just now, but you can try again in a moment.";

    return NextResponse.json({ insight: text });
  } catch (error) {
    console.error("Insight API error:", error);
    return NextResponse.json(
      { error: "Unexpected error while generating insight." },
      { status: 500 },
    );
  }
}
