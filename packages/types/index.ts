export type RecordObject = {
	stats: {
		correctAnswersCount: number;
		wrongAnswersCount: number;
		correctEliminationsCount: number;
		wrongEliminationsCount: number;
		totalMedpoints: number;
		totalTimeSpentMs: number;
	};
	data: {
		caseId: number;
		questionId: number;
		nthCase: number;
		nthQuestion: number;
		nthSelectedChoice: number;
		nthEliminatedChoices: number[];
		isCorrect: boolean;
		timeSpentMs?: number;
		medPoints: number;
	}[];
};
export type ReducedRecordObject = Omit<
	RecordObject["data"][0],
	"nthCase" | "nthQuestion" | "medPoints"
>[];

export type PlayerData = {
	id: number;
	username: string;
	medPoints: number;
	avatarUrl: string | null;
	university: string;
};

export type ChatMessage = {
	isSelf?: boolean;
	content: string;
};

/**
 * @fileoverview Socket type exports.
 */
