<script>
	import { createEventDispatcher } from "svelte"
	import { abSettings, lang, switchLang } from "../store.svelte"
	import { saveLSSetting } from "../utils/helpers"
	import { t } from "../utils/translation.svelte"

	import Modal from "../components/Modal.svelte"
	import SettingField from "../components/SettingField.svelte"
	import InfoLine from "../components/InfoLine.svelte"

	let settingsModal = $state(false)

	const dispatch = createEventDispatcher()

	let appSize = $state(null)

	let appScheme = $state(localStorage.getItem('scheme') || 'auto')
	let appColor = $state(localStorage.getItem('color') || 'color1')

	export async function show() {
		settingsModal = true
		showAppSize()
	}

	async function showAppSize() {
		if (navigator.storage?.estimate) {
			const est = await navigator.storage.estimate()
			appSize = {
				usage: est.usage ? getMBSize(est.usage) : 0,
				filesystem: est.usageDetails?.filesystem ? getMBSize(est.usageDetails.fileSystem) : 0,
				db: est.usageDetails?.indexedDB ? getMBSize(est.usageDetails.indexedDB) : 0
			}
		}
	}

	function getMBSize(val) {
		return parseFloat((val / 1024 / 1024).toFixed(1))
	}

	const schemeOptions = ['auto', 'dark', 'light']
	function switchScheme() {
		saveLSSetting('scheme', 'auto', appScheme)
		schemeOptions.forEach(v => document.documentElement.classList.toggle(`scheme-${v}`, v == appScheme))

		if (appScheme == 'auto') {
			document.querySelector('meta[name="theme-color"]').setAttribute('content', window.matchMedia('(prefers-color-scheme: dark)').matches ? '#000000' : '#ffffff')
		} else {
			document.querySelector('meta[name="theme-color"]').setAttribute('content', appScheme == 'dark' ? '#000000' : '#ffffff')
		}
	}

	const colorOptions = {
		color1: '#ec0c6d',
		color2: '#dd8605',
		color3: '#cab400',
		color4: '#75b728',
		color5: '#03b1c7',
		color6: '#128dec'
	}
	function switchColor(color) {
		appColor = color
		saveLSSetting('color', 'color1', appColor)
		Object.keys(colorOptions).forEach(v => document.documentElement.classList.toggle(`color-${v}`, v == appColor))
	}

	const seekOptions = [{
		title: '5s',
		value: 5
	}, {
		title: '15s',
		value: 15
	}, {
		title: '30s',
		value: 30
	}, {
		title: '60s',
		value: 60
	}]
	function switchSeek() {
		saveLSSetting('seek', 15, abSettings.seek)
		dispatch('updateMediaKeys')
	}

	const mediaKeysOptions = ['track', 'rewind']
	function switchMediaKeys() {
		saveLSSetting('mediaKeys', 'track', abSettings.mediaKeys)
		dispatch('updateMediaKeys')
	}

	const timeDisplayOptions = [{
		title: 'totalTime',
		value: 'total'
	}, {
		title: 'remaining',
		value: 'remaining'
	}]

	const appFSOptions = [{
		title: 'devFiles',
		value: 'fsapi'
	}, {
		title: 'appMem',
		value: 'opfs'
	}]
	function switchAppFSMode() {
		saveLSSetting('fsMode', 'fsapi', abSettings.fsMode)
	}
	const hasFSOption = 'showDirectoryPicker' in window

	const langOptions = [{
		title: 'EN',
		value: 'en'
	}, {
		title: 'SK',
		value: 'sk'
	}, {
		title: 'CZ',
		value: 'cz'
	}]
</script>

<Modal title={$t('settings')} on:close={() => settingsModal = false} show={settingsModal} width="narrow">
	<SettingField label={$t('lang')} options={langOptions} bind:group={$lang} on:change={switchLang} />
	<SettingField label={$t('colorScheme')} options={schemeOptions} bind:group={appScheme} on:change={switchScheme} />
	<SettingField label={$t('rewindTime')} options={seekOptions} bind:group={abSettings.seek} on:change={switchSeek} />
	<SettingField label={$t('mediaKeys')} options={mediaKeysOptions} bind:group={abSettings.mediaKeys} on:change={switchMediaKeys} />
	<SettingField label={$t('timeDisplay')} options={timeDisplayOptions} bind:group={abSettings.timeDisplay} on:change={abSettings.switchTimeDisplay} />
	<div class="lineSmaller">
		<p class="settings-group-label">{$t('appColor')}</p>
		<div class="settings-group-colors flex">
			{#each Object.entries(colorOptions) as entry}
				<button class="settings-group-color" class:isSelected={entry[0] == appColor} style="--bg: {entry[1]};" onclick={() => switchColor(entry[0])} aria-label={entry[0]}></button>
			{/each}
		</div>
	</div>
	{#if hasFSOption}
		<SettingField label={$t('booksStorage')} options={appFSOptions} bind:group={abSettings.fsMode} on:change={switchAppFSMode}>
			<p class="settings-note">
				{#if abSettings.fsMode == 'fsapi'}
					{$t('booksStorageN1')}
				{:else}
					{$t('booksStorageN2')}
				{/if}
			</p>
		</SettingField>
	{/if}
	{#if appSize}
		<p class="lineSmall lh125">{$t('appStorageUsed')}</p>
		<InfoLine title="Usage" value={`${appSize.usage}MB`} />
		{#if appSize.filesystem}
			<InfoLine title="File system" value={`${appSize.filesystem}MB`} />
		{/if}
		{#if appSize.db}
			<InfoLine title="DB" value={`${appSize.db}MB`} />
		{/if}
	{/if}
</Modal>