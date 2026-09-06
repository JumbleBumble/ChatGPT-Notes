import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
} from '@floating-ui/dom'
import { Check, ChevronDown } from 'lucide-react'
import './dropdown.css'

type DropdownOption = {
	value: string
	label: ReactNode
	disabled?: boolean
	title?: string
}

type DropdownProps = {
	id?: string
	value: string
	options: DropdownOption[]
	onValueChange: (value: string) => void
	disabled?: boolean
	className?: string
	icon?: ReactNode
	ariaLabel?: string
	placeholder?: string
}

export function Dropdown({
	id,
	value,
	options,
	onValueChange,
	disabled = false,
	className = '',
	icon,
	ariaLabel,
	placeholder = 'Select an option',
}: DropdownProps) {
	const [open, setOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(() => {
		const selectedIndex = options.findIndex(
			(option) => option.value === value,
		)
		return selectedIndex >= 0 ? selectedIndex : 0
	})
	const triggerRef = useRef<HTMLButtonElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
	const selectedOption = options.find((option) => option.value === value)

	useEffect(() => {
		const selectedIndex = options.findIndex(
			(option) => option.value === value,
		)
		setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
	}, [options, value])

	useEffect(() => {
		if (!open || !triggerRef.current || !menuRef.current) return
		const trigger = triggerRef.current
		const menu = menuRef.current
		const cleanup = autoUpdate(trigger, menu, () => {
			void computePosition(trigger, menu, {
				placement: 'bottom-start',
				strategy: 'fixed',
				middleware: [
					offset(6),
					flip({ padding: 8 }),
					shift({ padding: 8 }),
				],
			}).then(({ x, y }) => {
				Object.assign(menu.style, { left: `${x}px`, top: `${y}px` })
			})
		})

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node
			if (!trigger.contains(target) && !menu.contains(target))
				setOpen(false)
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				setOpen(false)
				trigger.focus()
			}
			if (event.key === 'Tab') setOpen(false)
		}

		document.addEventListener('pointerdown', handlePointerDown)
		document.addEventListener('keydown', handleKeyDown)
		return () => {
			cleanup()
			document.removeEventListener('pointerdown', handlePointerDown)
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [open])

	useEffect(() => {
		if (!open) return
		optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
	}, [activeIndex, open])

	const enabledIndices = options.reduce<number[]>(
		(indices, option, index) => {
			if (!option.disabled) indices.push(index)
			return indices
		},
		[],
	)

	const moveActive = (direction: 1 | -1) => {
		if (!enabledIndices.length) return
		const currentPosition = enabledIndices.indexOf(activeIndex)
		const nextPosition =
			currentPosition < 0
				? 0
				: (currentPosition + direction + enabledIndices.length) %
					enabledIndices.length
		setActiveIndex(enabledIndices[nextPosition])
	}

	const selectActive = () => {
		const option = options[activeIndex]
		if (!option || option.disabled) return
		onValueChange(option.value)
		setOpen(false)
		triggerRef.current?.focus()
	}

	const handleTriggerKeyDown = (
		event: ReactKeyboardEvent<HTMLButtonElement>,
	) => {
		if (disabled) return
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			if (!open) {
				setOpen(true)
				moveActive(event.key === 'ArrowDown' ? 1 : -1)
			} else {
				moveActive(event.key === 'ArrowDown' ? 1 : -1)
			}
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			if (open) selectActive()
			else setOpen(true)
		}
		if (event.key === 'Home' && open) {
			event.preventDefault()
			setActiveIndex(enabledIndices[0] ?? 0)
		}
		if (event.key === 'End' && open) {
			event.preventDefault()
			setActiveIndex(enabledIndices[enabledIndices.length - 1] ?? 0)
		}
	}

	const menuContainer =
		triggerRef.current?.closest('dialog') ?? document.body

	return (
		<div className={`dropdown ${open ? 'is-open' : ''} ${className}`}>
			<button
				ref={triggerRef}
				type="button"
				id={id}
				className="dropdown-trigger"
				aria-label={ariaLabel}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open && id ? `${id}-listbox` : undefined}
				disabled={disabled}
				onClick={() => setOpen((current) => !current)}
				onKeyDown={handleTriggerKeyDown}
			>
				{icon}
				<span className="dropdown-value">
					{selectedOption?.label ?? placeholder}
				</span>
				<ChevronDown
					size={15}
					className="dropdown-chevron"
					aria-hidden="true"
				/>
			</button>

			{open &&
				(createPortal(
					<div
						ref={menuRef}
						id={id ? `${id}-listbox` : undefined}
						className="dropdown-menu"
						role="listbox"
						aria-label={ariaLabel}
					>
						{options.map((option, index) => {
							const selected = option.value === value
							return (
								<button
									key={option.value}
									ref={(element) => {
										optionRefs.current[index] = element
									}}
									type="button"
									className={`dropdown-option ${selected ? 'is-selected' : ''} ${index === activeIndex ? 'is-active' : ''}`}
									role="option"
									aria-selected={selected}
									title={option.title}
									disabled={option.disabled}
									onMouseEnter={() => setActiveIndex(index)}
									onClick={() => {
										onValueChange(option.value)
										setOpen(false)
										triggerRef.current?.focus()
									}}
								>
									<span>{option.label}</span>
									{selected && (
										<Check size={14} aria-hidden="true" />
									)}
								</button>
							)
						})}
					</div>,
					menuContainer,
				) as ReactNode)}
		</div>
	)
}
