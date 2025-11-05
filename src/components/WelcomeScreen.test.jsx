// src/components/WelcomeScreen.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WelcomeScreen from './WelcomeScreen'

describe('WelcomeScreen', () => {
  it('should render the welcome screen', () => {
    render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    expect(screen.getByText('Together')).toBeInTheDocument()
    expect(screen.getByText('Private chat for couples')).toBeInTheDocument()
  })

  it('should display encryption information', () => {
    render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    expect(screen.getByText(/End-to-end encrypted/i)).toBeInTheDocument()
    expect(screen.getByText(/Military-grade encryption/i)).toBeInTheDocument()
  })

  it('should show security features', () => {
    render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    expect(screen.getByText(/XSalsa20-Poly1305/i)).toBeInTheDocument()
    expect(screen.getByText(/X25519 key exchange/i)).toBeInTheDocument()
    expect(screen.getByText(/Perfect Forward Secrecy/i)).toBeInTheDocument()
    expect(screen.getByText(/Zero-knowledge architecture/i)).toBeInTheDocument()
  })

  it('should show app features', () => {
    render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    expect(screen.getByText(/Messages encrypted before leaving device/i)).toBeInTheDocument()
    expect(screen.getByText(/Photos encrypted in cloud/i)).toBeInTheDocument()
  })

  it('should call onGetStarted when button is clicked', () => {
    const handleGetStarted = vi.fn()
    render(<WelcomeScreen onGetStarted={handleGetStarted} />)
    
    const button = screen.getByRole('button', { name: /Get Started/i })
    fireEvent.click(button)
    
    expect(handleGetStarted).toHaveBeenCalledTimes(1)
  })

  it('should have the Get Started button', () => {
    render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    const button = screen.getByRole('button', { name: /Get Started/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-gradient-to-r')
  })

  it('should display the Heart icon', () => {
    const { container } = render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    // Check if Heart icon is rendered (lucide-react icons)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('should have proper styling classes', () => {
    const { container } = render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    const wrapper = container.querySelector('.min-h-screen')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('bg-gradient-to-br')
  })

  it('should be accessible', () => {
    const { container } = render(<WelcomeScreen onGetStarted={vi.fn()} />)
    
    // Check for heading
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Together')
    
    // Check for button
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})
