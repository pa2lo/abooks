<script>
	import { createEventDispatcher } from "svelte"

	export let options
	export let group
	export let label

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
				<input class="settings-group-input-invisible" type="radio" name={id} bind:group={group} value={option.value || option} on:change={onChange} />
				<span class="settings-group-option-title">{option.title || option}</span>
			</label>
		{/each}
	</div>
	<slot />
</div>