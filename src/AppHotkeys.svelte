<script>
	import Modal from "./components/Modal.svelte"

	let hotkeysModal = $state(false)

	export function show() {
		hotkeysModal = true
	}
</script>

<Modal title="Keyboard shortcuts" on:close={() => hotkeysModal = false} show={hotkeysModal} width="narrow">
	<div class="line">
		<h4 class="lineSmall">General</h4>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">space</strong>
			Play / Pause
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">◀</strong>
			<strong class="hotkey-key">▶</strong>
			Rewind backward / forward
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">▼</strong>
			<strong class="hotkey-key">▲</strong>
			Volume down / up
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">p</strong>
			Previous track
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">n</strong>
			Next track
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">i</strong>
			Book info
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">f</strong>
			File list
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">d</strong>
			Bookmarks
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">a</strong>
			Add book
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">b</strong>
			Add bookmark
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">j</strong>
			Jump to
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">s</strong>
			Sleep timer
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">esc</strong>
			Close modal
		</p>
	</div>
	<div class="line">
		<h4 class="lineSmall">Sleep timer</h4>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">◀</strong>
			<strong class="hotkey-key">▶</strong>
			Set time
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">enter</strong>
			Start / stop timer
		</p>
	</div>
</Modal>