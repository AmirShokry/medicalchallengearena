import { useSound } from "@vueuse/sound";
import { defineStore } from "pinia";

const navigation_url = new URL("@/assets/sound/navgation.mp3", import.meta.url)
  .href;
const choice_eliminated_url = new URL(
  "@/assets/sound/choice-eliminated.mp3",
  import.meta.url
).href;

const choice_selected_url = new URL(
  "@/assets/sound/choice-selected.mp3",
  import.meta.url
).href;
const correct_answer_url = new URL(
  "@/assets/sound/correct-answer.mp3",
  import.meta.url
).href;
const count_down_url = new URL("@/assets/sound/countdown.mp3", import.meta.url)
  .href;
const find_match_url = new URL("@/assets/sound/find-match.mp3", import.meta.url)
  .href;
const incorrect_answer_url = new URL(
  "@/assets/sound/incorrect-answer.mp3",
  import.meta.url
).href;
const match_found_url = new URL(
  "@/assets/sound/match-found.mp3",
  import.meta.url
).href;
const message_url = new URL("@/assets/sound/message.mp3", import.meta.url).href;
const user_vs_opponent_url = new URL(
  "@/assets/sound/user-vs-opponent.mp3",
  import.meta.url
).href;

export const useAudioStore = defineStore("audio", () => {
  const navigation = useSound(navigation_url);
  const choice_selected = useSound(choice_selected_url);
  const correct_answer = useSound(correct_answer_url);
  const count_down = useSound(count_down_url);
  const find_match = useSound(find_match_url);
  const incorrect_answer = useSound(incorrect_answer_url);
  const match_found = useSound(match_found_url, { loop: true });
  const message = useSound(message_url);
  const user_vs_opponent = useSound(user_vs_opponent_url);
  const choice_eliminated = useSound(choice_eliminated_url);

  return {
    navigation,
    choice_selected,
    choice_eliminated,
    correct_answer,
    count_down,
    find_match,
    incorrect_answer,
    match_found,
    message,
    user_vs_opponent,
  };
});

// export const sounds = {
//   choice_eliminated: new Audio(),
//   choice_selected: new Audio(),
//   correct_answer: new Audio(),
//   count_down: new Audio(),
//   find_match: new Audio(),
//   incorrect_answer: new Audio(),
//   match_found: new Audio(),
//   message: new Audio(),
//   navigation: new Audio(),
//   user_vs_opponent: new Audio(),
// };
// export function initAudios() {
// sounds.navigation.src = new URL(
//   "@/assets/sound/navgation.mp3",
//   import.meta.url
// ).href;
// sounds.choice_eliminated.src = new URL(
//   "@/assets/sound/choice-eliminated.mp3",
//   import.meta.url
// ).href;
// sounds.choice_selected.src = new URL(
//   "@/assets/sound/choice-selected.mp3",
//   import.meta.url
// ).href;
// sounds.correct_answer.src = new URL(
//   "@/assets/sound/correct-answer.mp3",
//   import.meta.url
// ).href;
// sounds.count_down.src = new URL(
//   "@/assets/sound/countdown.mp3",
//   import.meta.url
// ).href;
// sounds.find_match.src = new URL(
//   "@/assets/sound/find-match.mp3",
//   import.meta.url
// ).href;
// sounds.incorrect_answer.src = new URL(
//   "@/assets/sound/incorrect-answer.mp3",
//   import.meta.url
// ).href;
// sounds.match_found.src = new URL(
//   "@/assets/sound/match-found.mp3",
//   import.meta.url
// ).href;
// sounds.message.src = new URL(
//   "@/assets/sound/message.mp3",
//   import.meta.url
// ).href;
// sounds.user_vs_opponent.src = new URL(
//   "@/assets/sound/user-vs-opponent.mp3",
//   import.meta.url
// ).href;
// }
