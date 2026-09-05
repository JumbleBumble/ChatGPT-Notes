const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const input = path.resolve('assets/icon.png')
const outputDir = path.resolve('assets')
const sizes = [16, 32, 48, 64, 128, 512]

async function generateIcons() {
	if (!fs.existsSync(input)) {
		throw new Error(`Master icon not found: ${input}`)
	}

	for (const size of sizes) {
		console.log(`Generating icon of size ${size}x${size}`)
		const output = path.join(outputDir, `icon${size}.png`)

		await sharp(input)
			.resize(size, size, {
				fit: 'cover',
				kernel: sharp.kernel.lanczos3,
			})
			.png()
			.toFile(output)

		console.log(`✓ Generated ${output}`)
	}

	console.log('\nAll extension icons generated.')
}

generateIcons().catch((error) => {
	console.error(error)
	process.exit(1)
})
