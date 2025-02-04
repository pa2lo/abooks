<script>
	let {
		value = $bindable(),
		label,
		placeholder,
		readonly
	} = $props()

	const uid = crypto.randomUUID()
</script>

<div class="settings-group lineSmaller">
	<label for={uid} class="settings-group-label">{label}</label>
	<input class="settings-group-input" type="text" id={uid} bind:value={value} {placeholder} {readonly} />
</div>