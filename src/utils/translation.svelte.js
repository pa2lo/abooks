import { labels } from "./labels"
import { lang } from "../store.svelte"
import { derived } from 'svelte/store'

export const t = derived(lang, $lang => (k) => labels[$lang]?.[k] ?? k)