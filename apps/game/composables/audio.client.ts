export function initAudios() {
  sounds.navigation.src = new URL(
    "@/assets/sound/navgation.mp3",
    import.meta.url
  ).href;
  sounds.choice_eliminated.src = new URL(
    "@/assets/sound/choice-eliminated.mp3",
    import.meta.url
  ).href;
  sounds.choice_selected.src = new URL(
    "@/assets/sound/choice-selected.mp3",
    import.meta.url
  ).href;
  sounds.correct_answer.src = new URL(
    "@/assets/sound/correct-answer.mp3",
    import.meta.url
  ).href;
  sounds.count_down.src = new URL(
    "@/assets/sound/countdown.mp3",
    import.meta.url
  ).href;
  sounds.find_match.src = new URL(
    "@/assets/sound/find-match.mp3",
    import.meta.url
  ).href;
  sounds.incorrect_answer.src = new URL(
    "@/assets/sound/incorrect-answer.mp3",
    import.meta.url
  ).href;
  sounds.match_found.src = new URL(
    "@/assets/sound/match-found.mp3",
    import.meta.url
  ).href;
  sounds.message.src = new URL(
    "@/assets/sound/message.mp3",
    import.meta.url
  ).href;
  sounds.user_vs_opponent.src = new URL(
    "@/assets/sound/user-vs-opponent.mp3",
    import.meta.url
  ).href;
}
export const sounds = {
  choice_eliminated: new Audio(),
  choice_selected: new Audio(),
  correct_answer: new Audio(),
  count_down: new Audio(),
  find_match: new Audio(),
  incorrect_answer: new Audio(),
  match_found: new Audio(),
  message: new Audio(),
  navigation: new Audio(),
  user_vs_opponent: new Audio(),
};
