<script>
	export let value
	export let label
	export let placeholder
	export let readonly

	const uid = crypto.randomUUID()
</script>

<div class="settings-group lineSmaller">
	<label for={uid} class="settings-group-label">{label}</label>
	<input class="settings-group-input" type="text" id={uid} bind:value={value} placeholder={placeholder} readonly={readonly} />
</div>