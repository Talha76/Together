// src/components/ErrorBoundary.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No Error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render error UI when error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument()
  })

  it('should display error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument()
  })

  it('should show Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const button = screen.getByRole('button', { name: /Try Again/i })
    expect(button).toBeInTheDocument()
  })

  it('should show Reload Page button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const button = screen.getByRole('button', { name: /Reload Page/i })
    expect(button).toBeInTheDocument()
  })

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const button = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(button)
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No Error')).toBeInTheDocument()
  })

  it('should call window.location.reload when Reload Page is clicked', () => {
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const button = screen.getByRole('button', { name: /Reload Page/i })
    fireEvent.click(button)
    
    expect(reloadSpy).toHaveBeenCalled()
    reloadSpy.mockRestore()
  })

  it('should show Start Fresh button after multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Click Try Again multiple times to increase error count
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(tryAgainButton)
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    fireEvent.click(tryAgainButton)
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    fireEvent.click(tryAgainButton)
    
    // After 3+ errors, should suggest reload
    expect(screen.getByText(/The error keeps happening/i)).toBeInTheDocument()
  })

  it('should display error icon', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Check for AlertTriangle icon (lucide-react)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('should show help text', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/If this problem persists/i)).toBeInTheDocument()
  })

  it('should handle multiple children', () => {
    render(
      <ErrorBoundary>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should catch errors in nested components', () => {
    const NestedComponent = () => {
      return (
        <div>
          <ThrowError shouldThrow={true} />
        </div>
      )
    }
    
    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument()
  })

  it('should have proper accessibility', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/Oops! Something went wrong/i)
    
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should clear localStorage when Start Fresh is clicked', () => {
    const clearSpy = vi.spyOn(Storage.prototype, 'clear')
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    // Force multiple errors to show Start Fresh button
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i })
    fireEvent.click(tryAgainButton)
    fireEvent.click(tryAgainButton)
    fireEvent.click(tryAgainButton)
    
    const startFreshButton = screen.getByRole('button', { name: /Start Fresh/i })
    fireEvent.click(startFreshButton)
    
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
