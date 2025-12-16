import { ref, reactive, computed, toRef } from "vue";

export default function getGameData() {
  const $$game = useGameStore();
  // Use toRef to keep reactivity - cases will update when $$game.data.cases changes
  const cases = toRef($$game.data, "cases");
  const user = $$game.players.user;
  const opponent = $$game.players.opponent;
  const flags = $$game.flags;
  const current = reactive({
    caseIdx: 0,
    questionIdx: 0,
    selectedChoiceIdx: -1,
    eliminatedChoicesIdx: new Set<number>(),
    questionNumber: 1,
  });

  // Make totalQuestionsNumber a computed so it updates when cases change
  const totalQuestionsNumber = computed(() =>
    cases.value.reduce((acc, c) => acc + c.questions.length, 0)
  );
  const lastReachedQuestionNumber = ref(1),
    canViewAnswer = ref(false);

  const isCorrect = computed(
      () =>
        cases.value[current.caseIdx]?.questions[current.questionIdx]?.choices[
          current.selectedChoiceIdx
        ]?.isCorrect
    ),
    canSubmit = computed(
      () =>
        !flags.ingame.isReviewingQuestion &&
        current.selectedChoiceIdx !== -1 &&
        !user.flags.hasSolved
    ),
    correctChoiceIdx = computed(() =>
      cases.value[current.caseIdx]?.questions[
        current.questionIdx
      ]?.choices.findIndex((choice) => choice.isCorrect)
    ),
    hasGameEnded = computed(
      () =>
        current.questionIdx + 1 ===
          cases.value[current.caseIdx]?.questions.length &&
        current.caseIdx + 1 === cases.value.length
    );

  const userStatus = computed(() => {
      if (!user.flags.hasSolved) return "pending";
      const lastRecord = user.records.data?.at(user.records.data.length - 1);
      if (!lastRecord) return "pending";
      return lastRecord.isCorrect ? "correct" : "incorrect";
    }),
    opponentStatus = computed(() => {
      if (!opponent.flags.hasSolved) return "pending";
      const lastRecord = opponent.records.data?.at(
        opponent.records.data.length - 1
      );
      if (!lastRecord) return "pending";
      return lastRecord.isCorrect ? "correct" : "incorrect";
    });

  function getRecordData({
    medPoints,
    correctOverride,
    timeSpentMs,
  }: {
    medPoints: number;
    correctOverride?: boolean;
    timeSpentMs: number;
  }) {
    return {
      caseId: cases.value[current.caseIdx]?.id!,
      questionId:
        cases.value[current.caseIdx]?.questions[current.questionIdx]?.id!,
      nthCase: current.caseIdx!,
      nthQuestion: current.questionIdx!,
      nthSelectedChoice: current.selectedChoiceIdx!,
      nthEliminatedChoices: Array.from(current.eliminatedChoicesIdx),
      isCorrect: correctOverride ?? isCorrect.value!,
      categoryId: cases.value[current.caseIdx]?.category_id!,
      medPoints,
      timeSpentMs,
    };
  }

  function revertState() {
    current.selectedChoiceIdx = -1;
    current.eliminatedChoicesIdx.clear();
    canViewAnswer.value = false;

    if (flags.ingame.isReviewingQuestion) revertCaseAndQuestionIndexes();
  }

  function getCaseIdxAndQuestionIdxFromLastReachedQuestionNumber() {
    let caseIdx = 0,
      questionIdx = 0,
      questionNumber = 0;
    for (let i = 0; i < cases.value.length; i++) {
      if (
        questionNumber + cases.value?.at(i)?.questions?.length! >=
        lastReachedQuestionNumber.value
      ) {
        caseIdx = i;
        questionIdx = lastReachedQuestionNumber.value - questionNumber - 1;
        break;
      }
      questionNumber += cases.value?.at(i)?.questions.length!;
    }

    return { caseIdx, questionIdx };
  }

  function revertCaseAndQuestionIndexes() {
    const { caseIdx, questionIdx } =
      getCaseIdxAndQuestionIdxFromLastReachedQuestionNumber();
    current.caseIdx = caseIdx;
    current.questionIdx = questionIdx;
    current.questionNumber = lastReachedQuestionNumber.value;
  }

  return {
    cases,
    opponent,
    user,
    flags,
    totalQuestionsNumber,
    current,
    canViewAnswer,
    hasGameEnded,
    lastReachedQuestionNumber,
    isCorrect,
    canSubmit,
    correctChoiceIdx,
    userStatus,
    opponentStatus,

    getRecordData,
    revertState,
  };
}
