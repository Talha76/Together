// src/components/MessageInput.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageInput } from './MessageInput'

describe('MessageInput', () => {
  const mockOnSendMessage = vi.fn()

  beforeEach(() => {
    mockOnSendMessage.mockClear()
  })

  it('should render message input', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    expect(textarea).toBeInTheDocument()
  })

  it('should render action buttons', () => {
    const { container } = render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    // Should have attach, emoji, and send buttons
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('should update message state when typing', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    
    expect(textarea).toHaveValue('Hello')
  })

  it('should call onSendMessage when send button is clicked', async () => {
    mockOnSendMessage.mockResolvedValue({ success: true })
    
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Test message' } })
    
    // Get all buttons and select the last one (send button)
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[buttons.length - 1]
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('should send message on Enter key press', async () => {
    mockOnSendMessage.mockResolvedValue({ success: true })
    
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    fireEvent.keyPress(textarea, { key: 'Enter', code: 'Enter', charCode: 13 })
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalled()
    })
  })

  it('should not send on Shift+Enter', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    fireEvent.keyPress(textarea, { 
      key: 'Enter', 
      code: 'Enter', 
      shiftKey: true 
    })
    
    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it('should clear input after sending', async () => {
    mockOnSendMessage.mockResolvedValue({ success: true })
    
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Test' } })
    
    const sendButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('should not send empty messages', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const sendButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(sendButton)
    
    expect(mockOnSendMessage).not.toHaveBeenCalled()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} disabled={true} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    expect(textarea).toBeDisabled()
  })

  it('should show emoji picker when emoji button is clicked', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const emojiButton = screen.getAllByRole('button')[1] // Second button (emoji)
    fireEvent.click(emojiButton)
    
    // Emoji picker should be visible
    const emojiPicker = screen.getByRole('button', { name: /❤️/i })
    expect(emojiPicker).toBeInTheDocument()
  })

  it('should add emoji to message when clicked', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    // Open emoji picker
    const emojiButton = screen.getAllByRole('button')[1]
    fireEvent.click(emojiButton)
    
    // Click an emoji
    const heartEmoji = screen.getByRole('button', { name: /❤️/i })
    fireEvent.click(heartEmoji)
    
    const textarea = screen.getByPlaceholderText('Message...')
    expect(textarea).toHaveValue('❤️')
  })

  it('should handle file selection', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    // File preview should appear
    expect(screen.getByText('test.png')).toBeInTheDocument()
  })

  it('should reject files that are too large', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const fileInput = document.querySelector('input[type="file"]')
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024 * 1024)], 'large.png', { 
      type: 'image/png' 
    })
    
    Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 * 1024 })
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    
    expect(alertSpy).toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('should remove selected file', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' }) // X button
    fireEvent.click(removeButton)
    
    expect(screen.queryByText('test.png')).not.toBeInTheDocument()
  })

  it('should show upload progress', async () => {
    mockOnSendMessage.mockImplementation((text, file, onProgress) => {
      onProgress(50)
      return Promise.resolve({ success: true })
    })
    
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    const sendButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(sendButton)
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })
  })

  it('should auto-resize textarea', () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />)
    
    const textarea = screen.getByPlaceholderText('Message...')
    const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    
    fireEvent.change(textarea, { target: { value: longText } })
    
    // Height should increase
    expect(textarea.style.height).toBeTruthy()
  })
})
