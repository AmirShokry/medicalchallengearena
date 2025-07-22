<script setup lang="ts">
useSeoMeta({
	title: "MCA | Ranks",
	description: "View the top users and their medpoints in our ranks.",
});
import { CrownIcon } from "lucide-vue-next";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableRow,
} from "@/components/ui/table";
const { $trpc } = useNuxtApp();
const { data: ranks, pending } = $trpc.common.ranks.useQuery();
</script>
<template>
	<div class="min-h-svh px-[min(15svw,6rem)] flex flex-col items-center">
		<div class="flex items-center justify-center w-full">
			<svg
				class="shrink-0"
				width="400"
				height="302"
				viewBox="0 0 483 302"
				fill="none"
				xmlns="http://www.w3.org/2000/svg">
				<g clip-path="url(#clip0_10_18)">
					<path
						name="rank1-rect"
						d="M170 133.774C170 125.552 176.762
					118.887 185.104 118.887H299.896C308.238 118.887 315 125.552
					315 133.774V302H170V104V133.774Z"
						class="fill-[#e6a631] dark:fill-[#c98c1d]" />
					<foreignObject
						name="rank1-content"
						x="190"
						y="140"
						width="100"
						height="122"
						><div
							class="text-[0.7rem] w-full [text-shadow:0px_1px_0px_rgba(0,0,0,0.5)] text-center mx-auto my-auto h-full flex items-center justify-center flex-col">
							<span class="truncate w-[100px] font-semibold">{{
								ranks?.at(0)?.username || ""
							}}</span
							><span class="truncate w-[100px]"
								>{{ ranks?.at(0)?.medPoints || "" }} MP</span
							>
						</div></foreignObject
					>
					<image
						name="rank1-avatar"
						href="https://i.ibb.co/j5jqhRm/default-avatar-1.webp"
						class="[clip-path:circle(50%_at_50%_50%)]"
						preserveAspectRatio="xMidYMid slice"
						x="199"
						y="34"
						width="85"
						height="85"></image>
					<path
						name="rank1-circle"
						d="M241.604 120.244C265.685 120.244 285.208 100.714 285.208 76.6222C285.208 52.5303 265.685 33 241.604 33C217.523 33 198 52.5303 198 76.6222C198 100.714 217.523 120.244 241.604 120.244Z"
						stroke="#FFB800"
						stroke-width="3" />
					<path
						name="rank1-triangle"
						d="M237.846 97.7064C240.12 95.4312 243.807 95.4312 246.082 97.7064L261.221 112.853C263.496 115.128 263.496 118.817 261.221 121.092L246.082 136.238C243.807 138.513 240.12 138.513 237.846 136.238L222.706 121.092C220.431 118.817 220.431 115.128 222.706 112.853L237.846 97.7064Z"
						class="fill-[#dfaa26] dark:fill-[#FFB800]" />
					<path
						name="rank1-rank"
						d="M241.972 111.273V120H240.915V112.381H240.864L238.733 113.795V112.722L240.915 111.273H241.972Z"
						class="fill-primary" />
					<path
						name="rank2-rectangle"
						d="M37 201.374C37 195.645 42.7363 191 49.8125 191H147.188C154.264 191 160 195.645 160 201.374V302H37V201.374Z"
						class="fill-[#b1b3b6] dark:fill-[#9fa3a7]" />
					<foreignObject x="50" y="200" width="100" height="86"
						><div
							class="text-[0.7rem] w-full [text-shadow:0px_1px_0px_rgba(0,0,0,0.5)] text-center mx-auto my-auto h-full flex items-center justify-center flex-col">
							<span class="truncate w-[100px] font-semibold">{{
								ranks?.at(1)?.username || ""
							}}</span
							><span class="truncate w-[100px]"
								>{{ ranks?.at(1)?.medPoints || "" }} MP</span
							>
						</div></foreignObject
					>
					<image
						name="rank2-avatar"
						href="https://i.ibb.co/j5jqhRm/default-avatar-1.webp"
						class="[clip-path:circle(50%_at_50%_50%)]"
						x="67"
						y="135"
						width="60"
						height="60"
						preserveAspectRatio="xMidYMid slice"></image>
					<path
						name="rank2-circle"
						d="M97.5 194C113.24 194 126 181.016 126 165C126 148.984 113.24 136 97.5 136C81.7599 136 69 148.984 69 165C69 181.016 81.7599 194 97.5 194Z"
						stroke="#898b8e"
						stroke-width="3" />
					<path
						name="rank2-triangle"
						d="M94.6779 178.376C96.5126 176.541 99.4874 176.541 101.322 178.376L110.624 187.678C112.459 189.513 112.459 192.488 110.624 194.322L101.322 203.624C99.4874 205.459 96.5126 205.459 94.6779 203.624L85.3761 194.322C83.5413 192.488 83.5413 189.513 85.3761 187.678L94.6779 178.376Z"
						class="fill-[#9fa3a7] dark:fill-[#9fa3a7]" />
					<path
						name="rank2-rank"
						d="M94.9034 193V192.233L97.7841 189.08C98.1222 188.71 98.4006 188.389 98.6193 188.116C98.8381 187.841 99 187.582 99.1051 187.341C99.2131 187.097 99.267 186.841 99.267 186.574C99.267 186.267 99.1932 1861 99.0455 185.777C98.9006 185.553 98.7017 185.379 98.4489 185.257C98.196 185.135 97.9119 185.074 97.5966 185.074C97.2614 185.074 96.9688 185.143 96.7188 185.283C96.4716 185.419 96.2798 185.611 96.1435 185.858C96.0099 186.105 95.9432 186.395 95.9432 186.727H94.9375C94.9375 186.216 95.0554 185.767 95.2912 185.381C95.527 184.994 95.848 184.693 96.2543 184.477C96.6634 184.261 97.1222 184.153 97.6307 184.153C98.142 184.153 98.5952 184.261 98.9901 184.477C99.3849 184.693 99.6946 184.984 99.919 185.351C100.143 185.717 100.256 186.125 100.256 186.574C100.256 186.895 100.197 187.209 100.081 187.516C99.9673 187.82 99.7685 188.159 99.4844 188.534C99.2031 188.906 98.8125 189.361 98.3125 189.898L96.3523 191.994V192.062H100.409V193H94.9034Z"
						class="fill-primary" />
					<path
						name="rank3-rectangle"
						d="M325 219.678C325 213.051 331.669 207.678 339.896 207.678H453.104C461.331 207.678 468 213.051 468 219.678V303.678H325V219.678Z"
						class="dark:fill-[#5D424D] fill-[#a5798a]" />
					<foreignObject
						name="rank3-content"
						x="346"
						y="220"
						width="100"
						height="63"
						><div
							class="text-[0.7rem] w-full [text-shadow:0px_1px_0px_rgba(0,0,0,0.5)] text-center mx-auto my-auto h-full flex items-center justify-center flex-col">
							<span class="truncate w-[100px] font-semibold">{{
								ranks?.at(2)?.username || ""
							}}</span
							><span class="truncate w-[100px]"
								>{{ ranks?.at(2)?.medPoints || "" }} MP</span
							>
						</div></foreignObject
					>
					<image
						name="rank3-avatar"
						href="https://i.ibb.co/j5jqhRm/default-avatar-1.webp"
						class="[clip-path:circle(50%_at_50%_50%)]"
						preserveAspectRatio="xMidYMid slice"
						x="368"
						y="155"
						width="57"
						height="57"></image>
					<path
						name="rank3-circle"
						d="M396.5 212.678C412.24 212.678 425 199.917 425 184.178C425 168.438 412.24 155.678 396.5 155.678C380.76 155.678 368 168.438 368 184.178C368 199.917 380.76 212.678 396.5 212.678Z"
						stroke="#5D424D"
						stroke-width="3" />
					<path
						name="rank3-triangle"
						d="M393.678 196.054C395.512 194.219 398.487 194.219 400.322 196.054L409.624 205.356C411.459 207.191 411.459 210.165 409.624 212L400.322 221.302C398.487 223.136 395.512 223.136 393.678 221.302L384.375 212C382.542 210.165 382.542 207.191 384.375 205.356L393.678 196.054Z"
						class="fill-[#8f6b7a] dark:fill-[#6A4B58]" />
					<path
						name="rank3-rank"
						d="M396.852 213.119C396.29 213.119 395.788 213.023 395.348 212.83C394.911 212.636 394.563 212.368 394.304 212.024C394.048 211.678 393.909 211.276 393.886 210.818H394.96C394.983 211.099 395.08 211.342 395.25 211.547C395.42 211.749 395.643 211.905 395.919 212.016C396.195 212.126 396.5 212.182 396.835 212.182C397.21 212.182 397.543 212.116 397.832 211.986C398.122 211.855 398.349 211.673 398.514 211.44C398.679 211.207 398.761 210.938 398.761 210.631C398.761 210.31 398.682 210.027 398.523 209.783C398.364 209.536 398.131 209.342 397.824 209.203C397.517 209.064 397.142 208.994 396.699 208.994H396V208.057H396.699C397.045 208.057 397.349 207.994 397.611 207.869C397.875 207.744 398.081 207.568 398.229 207.341C398.379 207.114 398.455 206.847 398.455 206.54C398.455 206.244 398.389 205.987 398.259 205.768C398.128 205.55 397.943 205.379 397.705 205.257C397.469 205.135 397.19 205.074 396.869 205.074C396.568 205.074 396.284 205.129 396.017 205.24C395.753 205.348 395.537 205.506 395.369 205.713C395.202 205.918 395.111 206.165 395.097 206.455H394.074C394.091 205.997 394.229 205.597 394.487 205.253C394.746 204.906 395.084 204.636 395.501 204.443C395.922 204.25 396.384 204.153 396.886 204.153C397.426 204.153 397.889 204.263 398.276 204.482C398.662 204.697 398.959 204.983 399.166 205.338C399.374 205.693 399.477 206.077 399.477 206.489C399.477 206.98 399.348 207.399 399.089 207.746C398.834 208.092 398.486 208.332 398.045 208.466V208.534C398.597 208.625 399.027 208.859 399.337 209.237C399.646 209.612 399.801 210.077 399.801 210.631C399.801 211.105 399.672 211.531 399.413 211.909C399.158 212.284 398.808 212.58 398.365 212.795C397.922 213.011 397.418 213.119 396.852 213.119Z"
						class="fill-primary" />
				</g>
				<defs>
					<clipPath id="clip0_10_18">
						<rect width="483" height="302" class="fill-primary" />
					</clipPath>
				</defs>
			</svg>
		</div>

		<div
			class="bg-muted w-[max(16rem+10vmin,50vw)] h-12 px-2 flex items-center gap-4 rounded-lg">
			<div
				class="@container/top-10 cursor-pointer bg-primary text-primary-foreground p-1 w-1/3 items-center justify-center rounded-xl font-geist font-bold flex gap-2">
				<CrownIcon class="shrink-0 @max-[100px]/top-10:hidden" />
				<p
					class="after:content-['TOP_10'] @max-[60px]/top-10:after:content-['#10']" />
			</div>
			<div
				class="@container/weekly hover:bg-primary hover:text-primary-foreground cursor-not-allowed text-primary/80 p-1 w-1/3 items-center justify-center rounded-xl font-geist font-bold flex gap-2">
				<CrownIcon class="shrink-0 @max-[100px]/weekly:hidden" />

				<p
					class="after:content-['Weekly'] @max-[60px]/weekly:after:content-['/7']" />
			</div>
			<div
				class="@container/monthly hover:bg-primary hover:text-primary-foreground cursor-not-allowed text-primary/80 p-1 w-1/3 items-center justify-center rounded-xl font-geist font-bold flex gap-2">
				<CrownIcon class="shrink-0 @max-[100px]/monthly:hidden" />
				<p
					class="after:content-['Monthly'] @max-[60px]/monthly:after:content-['/30']" />
			</div>
		</div>

		<Table class="w-[calc(75vw+1rem)] justify-self-center mt-5 mr-15">
			<TableBody>
				<TableRow v-for="(user, index) in ranks" :key="user.rank">
					<TableCell class="font-medium text-right">
						{{ index + 1 }}
					</TableCell>
					<TableCell class="flex">
						<p class="ml-[50%]">
							{{ user.username }}
						</p>
					</TableCell>
					<TableCell class="text-center">
						{{ user.medPoints }}
					</TableCell>
				</TableRow>
			</TableBody>
			<TableCaption>Ranks are updated daily (GMT+2)</TableCaption>
		</Table>
	</div>
</template>
