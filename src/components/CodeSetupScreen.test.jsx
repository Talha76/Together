// src/components/CodeSetupScreen.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CodeSetupScreen from './CodeSetupScreen'

describe('CodeSetupScreen', () => {
  const defaultProps = {
    userName: '',
    sharedCode: '',
    onUserNameChange: vi.fn(),
    onSharedCodeChange: vi.fn(),
    onConnect: vi.fn(),
    onBack: vi.fn()
  }

  it('should render the setup screen', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    expect(screen.getByText('Shared Secret Code')).toBeInTheDocument()
    expect(screen.getByText(/Both of you enter the same code/i)).toBeInTheDocument()
  })

  it('should display input fields', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    const nameInput = screen.getByPlaceholderText('Enter your name')
    const codeInput = screen.getByPlaceholderText('Min 6 characters')
    
    expect(nameInput).toBeInTheDocument()
    expect(codeInput).toBeInTheDocument()
  })

  it('should show security information', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    expect(screen.getByText(/The code is used to derive encryption keys/i)).toBeInTheDocument()
  })

  it('should call onUserNameChange when name is entered', () => {
    const handleChange = vi.fn()
    render(<CodeSetupScreen {...defaultProps} onUserNameChange={handleChange} />)
    
    const input = screen.getByPlaceholderText('Enter your name')
    fireEvent.change(input, { target: { value: 'Alice' } })
    
    expect(handleChange).toHaveBeenCalledWith('Alice')
  })

  it('should call onSharedCodeChange when code is entered', () => {
    const handleChange = vi.fn()
    render(<CodeSetupScreen {...defaultProps} onSharedCodeChange={handleChange} />)
    
    const input = screen.getByPlaceholderText('Min 6 characters')
    fireEvent.change(input, { target: { value: 'secret123' } })
    
    expect(handleChange).toHaveBeenCalledWith('secret123')
  })

  it('should display current values in inputs', () => {
    render(
      <CodeSetupScreen
        {...defaultProps}
        userName="Bob"
        sharedCode="mycode"
      />
    )
    
    const nameInput = screen.getByPlaceholderText('Enter your name')
    const codeInput = screen.getByPlaceholderText('Min 6 characters')
    
    expect(nameInput).toHaveValue('Bob')
    expect(codeInput).toHaveValue('mycode')
  })

  it('should call onConnect when Connect button is clicked', () => {
    const handleConnect = vi.fn()
    render(<CodeSetupScreen {...defaultProps} onConnect={handleConnect} />)
    
    const button = screen.getByRole('button', { name: /Connect/i })
    fireEvent.click(button)
    
    expect(handleConnect).toHaveBeenCalledTimes(1)
  })

  it('should call onBack when Back button is clicked', () => {
    const handleBack = vi.fn()
    render(<CodeSetupScreen {...defaultProps} onBack={handleBack} />)
    
    const button = screen.getByRole('button', { name: /Back/i })
    fireEvent.click(button)
    
    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it('should have password type for code input', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    const codeInput = screen.getByPlaceholderText('Min 6 characters')
    expect(codeInput).toHaveAttribute('type', 'password')
  })

  it('should show security tip', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    expect(screen.getByText(/Choose a strong code and share it securely/i)).toBeInTheDocument()
  })

  it('should have both Back and Connect buttons', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument()
  })

  it('should have proper styling for buttons', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    const connectButton = screen.getByRole('button', { name: /Connect/i })
    expect(connectButton).toHaveClass('bg-gradient-to-r')
  })

  it('should be accessible', () => {
    render(<CodeSetupScreen {...defaultProps} />)
    
    // Check for heading
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Shared Secret Code')
    
    // Check for labels
    expect(screen.getByText('Your Name')).toBeInTheDocument()
    expect(screen.getByText('Shared Secret Code')).toBeInTheDocument()
  })
})
