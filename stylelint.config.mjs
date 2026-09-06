export default {
	extends: ['stylelint-config-recommended', 'stylelint-config-tailwindcss'],
	rules: {
		'at-rule-no-unknown': [
			true,
			{
				ignoreAtRules: [
					'tailwind',
					'apply',
					'layer',
					'config',
					'variants',
					'responsive',
					'screen',
				],
			},
		],
		'selector-pseudo-element-no-unknown': [
			true,
			{
				ignorePseudoElements: [
					'-webkit-scrollbar',
					'-webkit-scrollbar-thumb',
					'-webkit-scrollbar-track',
				],
			},
		],
		'color-function-notation': null,
		'no-descending-specificity': null,
	},
}
