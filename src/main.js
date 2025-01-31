import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

let scheme = localStorage.getItem('scheme')
let color = localStorage.getItem('color')
if (scheme) {
	document.documentElement.classList.add(`scheme-${scheme}`)
	document.querySelector('meta[name="theme-color"]').setAttribute('content', scheme == 'dark' ? '#000000' : '#ffffff')
} else document.querySelector('meta[name="theme-color"]').setAttribute('content', window.matchMedia('(prefers-color-scheme: dark)').matches ? '#000000' : '#ffffff')
if (color) document.documentElement.classList.add(`color-${color}`)

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js')
			.then(registration => {
				console.log('ServiceWorker registration successful');
			})
			.catch(err => {
				console.log('ServiceWorker registration failed: ', err);
			});
	});
}