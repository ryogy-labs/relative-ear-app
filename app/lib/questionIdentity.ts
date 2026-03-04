export type QuestionIdentityInput = {
  rootMidi: number;
  intervalId: string;
  mode: "melodic" | "harmony";
  direction: "ascending" | "descending";
  note1Midi: number;
  note2Midi: number;
};

export type RepeatGuardInput = {
  rootMode: "random" | "fixedC";
  previousKey: string | null;
  candidateKey: string;
  intervalPoolSize: number;
  rerollAttempts: number;
  maxRerolls: number;
};

export function buildQuestionKey(input: QuestionIdentityInput): string {
  return [
    input.rootMidi,
    input.intervalId,
    input.mode,
    input.direction,
    input.note1Midi,
    input.note2Midi,
  ].join("|");
}

export function shouldRerollConsecutiveFixedQuestion(input: RepeatGuardInput): boolean {
  if (input.rootMode !== "fixedC") {
    return false;
  }
  if (!input.previousKey) {
    return false;
  }
  if (input.intervalPoolSize <= 1) {
    return false;
  }
  if (input.rerollAttempts >= input.maxRerolls) {
    return false;
  }
  return input.candidateKey === input.previousKey;
}

export function runQuestionIdentityLightweightChecks(): void {
  const sampleKey = buildQuestionKey({
    rootMidi: 60,
    intervalId: "P5",
    mode: "melodic",
    direction: "ascending",
    note1Midi: 60,
    note2Midi: 67,
  });

  if (
    !shouldRerollConsecutiveFixedQuestion({
      rootMode: "fixedC",
      previousKey: sampleKey,
      candidateKey: sampleKey,
      intervalPoolSize: 3,
      rerollAttempts: 0,
      maxRerolls: 10,
    })
  ) {
    throw new Error("Fixed mode repeat guard failed to detect identical consecutive question.");
  }

  if (
    shouldRerollConsecutiveFixedQuestion({
      rootMode: "fixedC",
      previousKey: sampleKey,
      candidateKey: sampleKey,
      intervalPoolSize: 1,
      rerollAttempts: 0,
      maxRerolls: 10,
    })
  ) {
    throw new Error("Fixed mode repeat guard should allow repeats when pool size is 1.");
  }

  if (
    shouldRerollConsecutiveFixedQuestion({
      rootMode: "random",
      previousKey: sampleKey,
      candidateKey: sampleKey,
      intervalPoolSize: 3,
      rerollAttempts: 0,
      maxRerolls: 10,
    })
  ) {
    throw new Error("Random mode must not use fixed-mode consecutive-repeat reroll logic.");
  }
}
