<script>
	let {
		label,
		autofocus,
		onblur,
		onenter,
		value = $bindable(),
		el = $bindable(),
		mins,
		max = 59,
		nextel,
		oninput
	} = $props()

	const id = crypto.randomUUID()

	const maxInputLength = $derived(String(max).length)

	function onKeyDown(e) {
		if (/^[a-zA-Z./]$/.test(e.key)) return e.preventDefault()

		if (e.key.length == 1) {
			if ((mins && parseInt(e.target.value) > 5 && e.target.selectionStart == 1) || (e.target.selectionStart == 0 && maxInputLength == 2 && e.target.value.length == 1 && e.key > 5) || (e.target.selectionStart + 1 > maxInputLength)) e.preventDefault()

			if (e.target.value.length == maxInputLength) {
				if (e.target.selectionStart == 0) {
					e.preventDefault()
					value = e.key
				} else if (e.target.selectionStart == maxInputLength - 1) {
					value = `${String(value)[0]}${e.key}`
				}
			}

			if (oninput) oninput(e)

			if (nextel && e.target.selectionStart + 1 == maxInputLength) {
				requestAnimationFrame(() => {
					nextel.focus()
				})
			}
		}

		if (e.key == 'Enter' && onenter) {
			e.target.blur()
			onenter()
		}
	}

	function onBlur(e) {
		if (isNaN(e.target.value) || !e.target.value) e.target.value = 0

		let newVal = Math.min(parseInt(e.target.value), max)

		if (mins) newVal = String(newVal).padStart(2, '0')

		value = newVal

		if (onblur) onblur()
	}

	function onFocus(e) {
		requestAnimationFrame(() => {
			e.target.selectionStart = e.target.selectionEnd = 0
		})
	}
</script>

<div class="jumpto-input-wrapper">
	{#if label}
		<label class="jumpto-input-label" for={id}>{ label }</label>
	{/if}
	<input id={id} class="jumpto-input" class:autofocus={autofocus} type="text" bind:this={el} inputmode="numeric" pattern="\d*" onkeydown={onKeyDown} onblur={onBlur} bind:value={value} maxlength=2 onfocus={onFocus} />
</div>