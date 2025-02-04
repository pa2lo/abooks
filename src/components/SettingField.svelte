<script>
	import { createEventDispatcher } from "svelte"

	let {
		options,
		group = $bindable(),
		label,
		children
	} = $props()

	const dispatch = createEventDispatcher()

	const id = crypto.randomUUID()

	function onChange() {
		dispatch('change')
	}
</script>

<div class="settings-group lineSmaller">
	<p class="settings-group-label">{ label }</p>
	<div class="settings-group-options">
		{#each options as option}
			<label class="settings-group-option" class:isSelected={group == (option.value ? option.value : option)}>
				<input class="settings-group-input-invisible" type="radio" name={id} bind:group={group} value={option.value || option} onchange={onChange} />
				<span class="settings-group-option-title">{option.title || option}</span>
			</label>
		{/each}
	</div>
	{@render children?.()}
</div>