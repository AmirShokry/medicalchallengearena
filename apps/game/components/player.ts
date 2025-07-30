import type { RecordObject, PlayerData } from "@package/types";
import { ResettableObject } from "./ResettableObject";

export class Player {
  public info = ResettableObject<PlayerData>({
    id: -1,
    username: "",
    avatarUrl: "",
    medPoints: -1,
    university: "",
  });

  public flags = ResettableObject({
    hasAccepted: false,
    hasDeclined: false,
    hasLeft: false,
    hasSolved: false,
    isMaster: false,
    isInvited: false,
  });

  public records = ResettableObject<RecordObject>({
    stats: {
      correctAnswersCount: 0,
      wrongAnswersCount: 0,
      correctEliminationsCount: 0,
      wrongEliminationsCount: 0,
      totalMedpoints: 0,
      totalTimeSpentMs: 0,
    } as RecordObject["stats"],
    data: [] as RecordObject["data"],
  });

  public timer = useTimer();
}
