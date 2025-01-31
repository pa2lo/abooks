import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		svelte(),
		{
			name: 'timestamp-replacement',
			generateBundle() {
				const timestamp = Date.now();
				const swContent = fs.readFileSync('./dist/service-worker.js', 'utf-8');
				const updatedContent = swContent.replace('{TIMESTAMP}', timestamp);
				fs.writeFileSync('./dist/service-worker.js', updatedContent);
			}
		}
	],
})

/*
V2
import path from 'path';

writeBundle() {
	const swSource = fs.readFileSync(
		path.resolve(__dirname, 'public/service-worker.js'),
		'utf-8'
	);

	const timestamp = Date.now();
	const updatedContent = swSource.replace('{TIMESTAMP}', timestamp.toString());

	fs.writeFileSync(
		path.resolve(__dirname, 'dist/service-worker.js'),
		updatedContent
	);
}
*/