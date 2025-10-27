# Development Guide

## Quick Reference

### Component Locations

- **Screen Components**: `src/components/*Screen.jsx`
- **Chat Components**: `src/components/Chat*.jsx`
- **Custom Hooks**: `src/hooks/*.js`

### Adding a New Feature

#### 1. New UI Screen

1. Create component in `src/components/YourScreen.jsx`
2. Add new step in `App.jsx` state
3. Add routing logic in `App.jsx` render section
4. Pass necessary props from hooks

#### 2. New Encryption Feature

1. Add function to `src/hooks/useEncryption.js`
2. Export from hook
3. Use in relevant component

#### 3. New Message Feature

1. Add function to `src/hooks/useMessages.js`
2. Export from hook
3. Use in `ChatScreen` or child components

## Common Patterns

### Adding a New Screen

```javascript
// 1. Create the component
// src/components/NewScreen.jsx
export default function NewScreen({ onNext, onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      {/* Your UI here */}
    </div>
  );
}

// 2. Import in App.jsx
import NewScreen from "./components/NewScreen";

// 3. Add step logic
if (step === "new-screen") {
  return (
    <>
      <NewScreen
        onNext={() => setStep("next")}
        onBack={() => setStep("previous")}
      />
    </>
  );
}
```

### Using Encryption Hook

```javascript
// In any component
import { useEncryption } from "../hooks/useEncryption";

function MyComponent() {
  const encryption = useEncryption();

  const handleEncrypt = () => {
    const encrypted = encryption.encryptMessage("Hello!");
    console.log(encrypted); // { ciphertext, nonce }
  };

  return <button onClick={handleEncrypt}>Encrypt</button>;
}
```

### Using Messages Hook

```javascript
// In any component
import { useMessages } from "../hooks/useMessages";
import { useEncryption } from "../hooks/useEncryption";

function MyComponent() {
  const encryption = useEncryption();
  const { messages, addMessage } = useMessages(
    encryption.sharedSecret,
    encryption.encryptMessage,
    encryption.decryptMessage,
    encryption.encryptFile
  );

  const handleSend = async () => {
    await addMessage("User", "Hello!", null);
  };

  return <button onClick={handleSend}>Send</button>;
}
```

## State Flow

## Testing Guide

### Component Testing Example

```javascript
// __tests__/WelcomeScreen.test.jsx
import { render, fireEvent } from "@testing-library/react";
import WelcomeScreen from "../components/WelcomeScreen";

test("calls onGetStarted when button clicked", () => {
  const mockOnGetStarted = jest.fn();
  const { getByText } = render(
    <WelcomeScreen onGetStarted={mockOnGetStarted} />
  );

  fireEvent.click(getByText("Get Started"));
  expect(mockOnGetStarted).toHaveBeenCalled();
});
```

### Hook Testing Example

```javascript
// __tests__/useEncryption.test.js
import { renderHook, act } from "@testing-library/react-hooks";
import { useEncryption } from "../hooks/useEncryption";

test("generates QR keys", () => {
  const { result } = renderHook(() => useEncryption());

  act(() => {
    result.current.generateQRKeys();
  });

  expect(result.current.myKeys).toBeTruthy();
  expect(result.current.qrCodeData).toBeTruthy();
});
```

## Performance Tips

### Memoization

```javascript
// Memoize expensive calculations
const decryptedMessages = useMemo(() => {
  return messages.map((msg) => decryptMessage(msg));
}, [messages, decryptMessage]);

// Memoize callbacks
const handleSend = useCallback(
  (text, file) => {
    addMessage(userName, text, file);
  },
  [addMessage, userName]
);
```

### Component Memoization

```javascript
// Prevent unnecessary re-renders
export default React.memo(MessageList, (prevProps, nextProps) => {
  return prevProps.messages === nextProps.messages;
});
```

## Debugging Tips

### Enable Debug Logs

```javascript
// In useEncryption.js
const generateQRKeys = () => {
  console.log("[useEncryption] Generating QR keys...");
  const keys = encryption.generateKeyPair();
  console.log("[useEncryption] Keys generated:", { publicKey: keys.publicKey });
  // ...
};
```

### React DevTools

1. Install React DevTools browser extension
2. Look for "Together" component tree
3. Inspect props and state in real-time

### localStorage Inspector

```javascript
// In browser console
localStorage.getItem("togetherUserName");
localStorage.getItem("togetherMyKeys");
localStorage.getItem("togetherSharedSecret");
```

## Common Issues

### Issue: Messages not encrypting

**Solution**: Verify `sharedSecret` exists before calling encrypt functions

### Issue: Component not re-rendering

**Solution**: Ensure state updates are using setState, not direct mutation

## Code Style

### Naming Conventions

- Components: PascalCase (`WelcomeScreen`)
- Hooks: camelCase with 'use' prefix (`useEncryption`)
- Event handlers: camelCase with 'handle' prefix (`handleSendMessage`)
- Props: camelCase, callbacks start with 'on' (`onSendMessage`)

### File Organization

- One component per file
- Export default at bottom
- Group imports: React, third-party, local
- Props at top of component

### Example Component Structure

```javascript
import React, { useState, useEffect } from "react";
import ThirdPartyLib from "third-party";
import LocalComponent from "./LocalComponent";

export default function MyComponent({ data, onAction }) {
  // State
  const [localState, setLocalState] = useState(null);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return <div>{/* JSX */}</div>;
}
```

## Git Workflow

### Committing Changes

```bash
# Component changes
git add src/components/NewComponent.jsx
git commit -m "feat: add NewComponent for feature X"

# Hook changes
git add src/hooks/useNewHook.js
git commit -m "feat: add useNewHook for managing Y"

# Bug fixes
git commit -m "fix: resolve encryption issue in ChatScreen"

# Refactoring
git commit -m "refactor: extract Z into separate component"
```

## Resources

- **TweetNaCl Docs**: <https://github.com/dchest/tweetnacl-js>
- **React Hooks**: <https://react.dev/reference/react>
- **Tailwind CSS**: <https://tailwindcss.com/docs>
- **Lucide Icons**: <https://lucide.dev/icons>
