<script setup lang="ts">
definePageMeta({
	layout: "game",
});

import { Peer } from "peerjs";

import { ref } from "vue";
var peer = new Peer();
const myId = ref("");
peer.on("open", function (id) {
	console.log("My peer ID is: " + id);
	myId.value = id;
});

const opponentId = ref("");
let conn: ReturnType<Peer["connect"]> | null = null;

// Handle incoming connections
peer.on("connection", (incomingConn) => {
	conn = incomingConn;
	conn.on("open", () => {
		console.log("Opponent connected to you:", conn?.peer);
	});
	conn.on("data", (data) => {
		alert(`Received data ${data}`);
	});
	conn.on("error", (err) => {
		console.error("Connection error:", err);
	});
});

function connect() {
	if (!opponentId.value) {
		alert("Please enter an opponent ID");
		return;
	}
	conn = peer.connect(opponentId.value);
	conn.on("open", () => {
		console.log("Connected to opponent:", opponentId.value);
	});
	conn.on("data", (data) => {
		alert(`Received data ${data}`);
	});
	conn.on("error", (err) => {
		console.error("Connection error:", err);
	});
}

function sendMessage() {
	if (conn && conn.open) {
		conn.send("Hello from " + myId.value);
	} else {
		alert("No connection established.");
	}
}
</script>
<template>
	<div>mutli</div>
	<div class="bg-red-500">{{ myId }}</div>
	<input v-model="opponentId" type="text" />
	<ui-button @click="connect"> connect </ui-button>
	<ui-button @click="sendMessage">Send</ui-button>
</template>
