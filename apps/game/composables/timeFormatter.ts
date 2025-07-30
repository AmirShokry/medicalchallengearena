/**
 * @description Converts milliseconds to MM:SS format
 * @params  ms: Time in milliseconds
 * @returns String in MM:SS format
 * */

export function msToMinutesAndSeconds(ms: number) {
	const totalSeconds = Math.ceil(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const formattedSeconds = seconds.toString().padStart(2, "0");
	return `${minutes.toString().padStart(2, "0")}:${formattedSeconds}`;
}
export function msToMinutesAndSecondsPrecise(ms: number) {
	const totalSeconds = Math.ceil(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	const formattedSeconds = seconds.toString().padStart(2, "0");
	return `${minutes.toString().padStart(2, "0")}:${formattedSeconds}`;
}
