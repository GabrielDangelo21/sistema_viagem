
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button, Badge } from './UI'

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>)
        expect(screen.getByText('Click Me')).toBeInTheDocument()
    })

    it('handles click events', () => {
        const handleClick = vi.fn()
        render(<Button onClick={handleClick}>Click Me</Button>)
        fireEvent.click(screen.getByText('Click Me'))
        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('shows loading state', () => {
        render(<Button loading>Click Me</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
        // Check for loader presence (by class or implicit via disabled)
    })

    it('applies variant classes', () => {
        const { container } = render(<Button variant="danger">Delete</Button>)
        expect(container.firstChild).toHaveClass('bg-red-50')
    })
})

describe('Badge Component', () => {
    it('renders correct label for status', () => {
        render(<Badge status="confirmed" />)
        expect(screen.getByText('Confirmada')).toBeInTheDocument()
    })

    it('applies correct styles for status', () => {
        const { container } = render(<Badge status="confirmed" />)
        expect(container.firstChild).toHaveClass('bg-emerald-50')
    })

    it('handles unknown status gracefully', () => {
        render(<Badge status="unknown" />)
        expect(screen.getByText('unknown')).toBeInTheDocument()
    })
})
