<script>
	import Modal from "../components/Modal.svelte"
	import { t } from "../utils/translation.svelte"

	let hotkeysModal = $state(false)

	export function show() {
		hotkeysModal = true
	}
</script>

<Modal title={$t('shortcuts')} on:close={() => hotkeysModal = false} show={hotkeysModal} width="narrow">
	<div class="line">
		<h4 class="lineSmall">{$t('general')}</h4>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">space</strong>
			{$t('keySP')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">◀</strong>
			<strong class="hotkey-key">▶</strong>
			{$t('keyArrH')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">▼</strong>
			<strong class="hotkey-key">▲</strong>
			{$t('keyArrV')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">p</strong>
			{$t('prevTrack')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">n</strong>
			{$t('nextTrack')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">i</strong>
			{$t('bookInfo')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">f</strong>
			{$t('fileList')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">d</strong>
			{$t('bookmarks')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">a</strong>
			{$t('addBook')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">b</strong>
			{$t('addBookmark')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">j</strong>
			{$t('jumpTo')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">s</strong>
			{$t('sleepTimer')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">esc</strong>
			{$t('keyEsc')}
		</p>
	</div>
	<div class="line">
		<h4 class="lineSmall">{$t('sleepTimer')}</h4>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">◀</strong>
			<strong class="hotkey-key">▶</strong>
			{$t('keySlE')}
		</p>
		<p class="hotkey-info lineSmall flex ai-c">
			<strong class="hotkey-key">enter</strong>
			{$t('keySlArr')}
		</p>
	</div>
</Modal>