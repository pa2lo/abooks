<script>
	import { createEventDispatcher } from "svelte"
	import { abSettings } from "./store.svelte"
	import { saveLSSetting } from "./helpers"

	import Modal from "./components/Modal.svelte"
	import SettingField from "./components/SettingField.svelte"
	import InfoLine from "./components/InfoLine.svelte"

	let settingsModal = $state(false)

	const dispatch = createEventDispatcher()

	let appSize = $state()

	let appScheme = $state(localStorage.getItem('scheme') || 'auto')
	let appColor = $state(localStorage.getItem('color') || 'color1')

	export async function show() {
		settingsModal = true
		showAppSize()
	}

	async function showAppSize() {
		const est = await navigator.storage.estimate()
		if (est.usageDetails) {
			appSize = {
				filesystem: parseFloat((est.usageDetails.fileSystem / 1024 / 1024).toFixed(1)),
				db: parseFloat((est.usageDetails.indexedDB / 1024 / 1024).toFixed(1))
			}
		}
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
		title: 'Total time',
		value: 'total'
	}, {
		title: 'Remaining',
		value: 'remaining'
	}]

	const appFSOptions = [{
		title: 'Device files',
		value: 'fsapi'
	}, {
		title: 'App memory',
		value: 'opfs'
	}]
	function switchAppFSMode() {
		saveLSSetting('fsMode', 'fsapi', abSettings.fsMode)
	}
	const hasFSOption = 'showDirectoryPicker' in window
</script>

<Modal title="Settings" on:close={() => settingsModal = false} show={settingsModal} width="narrow">
	<SettingField label="Color scheme" options={schemeOptions} bind:group={appScheme} on:change={switchScheme} />
	<SettingField label="Rewind time" options={seekOptions} bind:group={abSettings.seek} on:change={switchSeek} />
	<SettingField label="Prev/next media keys" options={mediaKeysOptions} bind:group={abSettings.mediaKeys} on:change={switchMediaKeys} />
	<SettingField label="Time display" options={timeDisplayOptions} bind:group={abSettings.timeDisplay} on:change={abSettings.switchTimeDisplay} />
	<div class="lineSmaller">
		<p class="settings-group-label">App color</p>
		<div class="settings-group-colors flex">
			{#each Object.entries(colorOptions) as entry}
				<button class="settings-group-color" class:isSelected={entry[0] == appColor} style="--bg: {entry[1]};" onclick={() => switchColor(entry[0])} aria-label={entry[0]}></button>
			{/each}
		</div>
	</div>
	{#if hasFSOption}
		<SettingField label="Books storage" options={appFSOptions} bind:group={abSettings.fsMode} on:change={switchAppFSMode}>
			<p class="settings-note">
				{#if abSettings.fsMode == 'fsapi'}
					Book files will be read from the device's storage. The app will have a smaller size but may ask for permissions more often.
				{:else}
					New books will be stored in apps memory. This option may cause higher app size, but app will not ask for permissions.
				{/if}
			</p>
		</SettingField>
	{/if}
	{#if appSize}
		<p class="lineSmall lh125">App storage usage:</p>
		<InfoLine title="File system" value={`${appSize.filesystem}MB`} />
		<InfoLine title="DB" value={`${appSize.db}MB`} />
	{/if}
</Modal>