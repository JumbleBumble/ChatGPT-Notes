const fs = require('node:fs')
const path = require('node:path')

const staticDirectory = path.join(process.cwd(), '.plasmo', 'static')

if (!fs.existsSync(staticDirectory)) {
	process.exit(0)
}

const htmlFiles = []

const collectHtmlFiles = (directory) => {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			collectHtmlFiles(entryPath)
		} else if (entry.isFile() && entry.name.endsWith('.html')) {
			htmlFiles.push(entryPath)
		}
	}
}

collectHtmlFiles(staticDirectory)

for (const filePath of htmlFiles) {
	const html = fs.readFileSync(filePath, 'utf8')
	const sanitizedHtml = html
		.replace(
			/\s*@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Inter:[^\"]+"\);/,
			'',
		)
		.replace(
			/font-family: Inter, sans-serif;/,
			'font-family: ui-sans-serif, system-ui, sans-serif;',
		)

	if (sanitizedHtml !== html) {
		fs.writeFileSync(filePath, sanitizedHtml)
	}
}
