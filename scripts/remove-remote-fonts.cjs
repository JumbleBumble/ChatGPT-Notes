const fs = require('node:fs')
const path = require('node:path')

console.log('Removing remote code.')
const directoriesToSanitize = [
	path.join(process.cwd(), '.plasmo', 'static'),
	path.join(process.cwd(), 'build'),
]

const htmlFiles = new Set()
const javascriptFiles = new Set()

const collectHtmlFiles = (directory) => {
	if (!fs.existsSync(directory)) return

	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			collectHtmlFiles(entryPath)
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			htmlFiles.add(entryPath)
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			javascriptFiles.add(entryPath)
		}
	}
}

for (const directory of directoriesToSanitize) {
	collectHtmlFiles(directory)
}

for (const filePath of htmlFiles) {
	const html = fs.readFileSync(filePath, 'utf8')
	const sanitizedHtml = html
		.replace(
			/\s*@import\s+(?:url\()?['"]https:\/\/fonts\.googleapis\.com\/css2\?[^'"]+['"]\)?;?/g,
			'',
		)
		.replace(
			/font-family:\s*Inter,\s*sans-serif;/g,
			'font-family: ui-sans-serif, system-ui, sans-serif;',
		)

	if (sanitizedHtml !== html) {
		fs.writeFileSync(filePath, sanitizedHtml)
	}
}

for (const filePath of javascriptFiles) {
	const javascript = fs.readFileSync(filePath, 'utf8')
	const sanitizedJavascript = javascript.replace(
		'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js',
		'',
	)

	if (sanitizedJavascript !== javascript) {
		fs.writeFileSync(filePath, sanitizedJavascript)
	}
}
