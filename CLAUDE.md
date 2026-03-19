# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VAIR (Video Assistant Intelligence Referee) is a single-file React application that provides an AI-powered referee assistant for interpreting the IFAB Laws of the Game 2025/26. The application uses Claude (Anthropic API) to answer questions about football/soccer refereeing decisions based on the complete official rulebook.

## Development Setup

This repository contains only a standalone React component file (`referee-ai.jsx`) with no build system, package.json, or development infrastructure. The file can be used in several ways:

1. **Copy into existing React project**: Import and use the `RefereeLLM` component in an existing React application
2. **Use with AI coding tools**: Deploy directly using platforms like bolt.new, v0.dev, or similar tools that can run React components
3. **Set up build environment**: Create a new React project (Vite, Next.js, etc.) and add this component

**Note**: The file contains very long lines (65482+ characters) due to the embedded LAWS_TEXT constant. Most editors will handle this, but be aware when viewing or editing.

## Architecture

### Single-File Structure
The entire application is contained in `referee-ai.jsx`:

- **LAWS_TEXT** (lines 3-4): A large string constant containing the complete IFAB Laws of the Game 2025/26 text (~212KB). This is the authoritative reference document that the AI uses.

- **SYSTEM_PROMPT** (lines 5-24): The prompt template that instructs Claude to act as an expert referee. It embeds the LAWS_TEXT and provides behavioral guidelines (cite Law numbers, explain reasoning, mention VAR possibilities, be decisive).

- **SAMPLE_QUESTIONS** (lines 26-28): Example questions displayed in the UI to guide users.

- **RefereeLLM Component** (line 30-end): The main React component implementing:
  - Chat interface with message history
  - Direct API calls to Anthropic's Claude API (`claude-sonnet-4-20250514`)
  - Referee-themed UI (dark green gradient, football aesthetic)
  - Error handling and loading states

### API Integration
The application makes direct browser-side calls to `https://api.anthropic.com/v1/messages`:
- Model: `claude-sonnet-4-20250514`
- Max tokens: 1000
- System prompt includes the full LAWS_TEXT
- Conversation history maintained in React state

**Security Note**: The current implementation does not include API key handling in the visible code. In production, this requires either:
1. A proxy server to keep the API key secure
2. Client-side API key input (insecure for public deployments)

### UI Design
- Dark theme with green/football colors (`#0a1628`, `#0d2137`, `#0a1e0f`)
- Sticky header with title and subtitle
- Scrollable message area with user/assistant messages
- Fixed input area at bottom with textarea and send button
- Loading animation (pulsing dots)
- Error display with red-tinted styling

## Key Implementation Details

### Message Flow
1. User types question about a refereeing incident
2. Message added to state and sent to Claude API with full conversation history
3. System prompt (including all Laws text) sent with every request
4. Assistant response parsed and displayed
5. Auto-scroll to latest message

### Data Structure
Messages are stored as: `{ role: "user" | "assistant", content: string }`

### Styling
All styles are inline React style objects. No external CSS files or CSS-in-JS libraries used.

## Modifying the Application

### Updating the Laws of the Game
To update LAWS_TEXT with a new version:
1. Replace the string constant (line 3) with the new official IFAB text
2. Update the year references in SYSTEM_PROMPT and UI text
3. Test with questions about new or changed rules

### Changing AI Behavior
Modify SYSTEM_PROMPT (lines 5-24) to adjust:
- The referee's personality/tone
- Citation requirements
- Response format
- Focus areas (e.g., more emphasis on VAR, youth football modifications)

### UI Customization
- Colors: Search for hex colors and rgba() values
- Layout: Modify inline style objects in the JSX
- Messages: Update header titles, placeholders, sample questions

### API Configuration
Line 51: Change model to switch Claude versions (e.g., `claude-opus-4-20250514` for more capable responses)
Line 52: Adjust `max_tokens` for longer/shorter responses (current: 1000)

### Adding API Key Handling
The current implementation doesn't include API key management. To make this functional, you need to add:

1. **Environment variable approach** (recommended for local development):
   - Add API key to environment variables
   - Access via `import.meta.env.VITE_ANTHROPIC_API_KEY` (Vite) or `process.env.REACT_APP_ANTHROPIC_API_KEY` (CRA)
   - Add to request headers: `"x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY`

2. **Proxy server approach** (recommended for production):
   - Create a backend endpoint that proxies requests to Anthropic API
   - Keep API key server-side only
   - Update fetch URL to point to your backend

3. **User input approach** (only for personal use):
   - Add state for API key: `const [apiKey, setApiKey] = useState("")`
   - Render input field for user to enter their key
   - Include in request headers: `"x-api-key": apiKey`

## Repository Structure

```
VAIR/
├── referee-ai.jsx    # Single-file React component (entire application)
└── CLAUDE.md         # This file
```
