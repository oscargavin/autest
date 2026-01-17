# tanstack-ai Documentation

## useChat Hook for Streaming Chat

The useChat hook from @tanstack/ai-react simplifies building chat interfaces in React by handling message streaming and user interactions. It connects to a server or API endpoint to stream responses in real-time, providing a seamless chat experience. This hook is essential for managing chat state and rendering messages dynamically.

```typescript
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react';
const chat = useChat({ connection: fetchServerSentEvents('/api/chat') });

const { messages, sendMessage, isLoading } = useChat({ connection: fetchServerSentEvents('/api/chat') });
```

---

## Server-Side Chat with Streaming SSE

TanStack AI supports server-side chat functionality with Server-Sent Events (SSE) for real-time streaming of responses. Using the stream utility or fetchServerSentEvents, you can connect to a server endpoint that handles chat logic and streams AI responses back to the client. This approach is ideal for offloading processing to the server.

```typescript
import { useChat, stream } from '@tanstack/ai-react';
const chat = useChat({ connection: stream((messages) => serverChatFunction({ messages })) });

import { fetchServerSentEvents } from '@tanstack/ai-react';
const connection = fetchServerSentEvents('/api/chat');
```

---

## Provider Adapters for AI Models

TanStack AI offers tree-shakeable adapters for multiple AI providers like OpenAI, Anthropic, Gemini, and Ollama. Each adapter can be configured with API keys or host details to connect to the respective service, allowing provider-agnostic chat implementations. This flexibility helps developers switch providers without changing core logic.

```typescript
import { chat } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';
const stream = chat({ adapter: openaiText({ apiKey: 'key' }), model: 'gpt-4o', messages: [] });

import { anthropicText } from '@tanstack/ai-anthropic';
const stream = chat({ adapter: anthropicText({ apiKey: 'key' }), model: 'claude-3-5-sonnet-20241022', messages: [] });
```

---

## Tool Definition and Function Calling

TanStack AI enables defining tools for AI models to call external functions using the toolDefinition utility. Tools are defined with schemas (often using Zod) to validate inputs, allowing the AI to interact with custom logic like fetching weather data. This is powerful for extending AI capabilities with structured function calls.

```typescript
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';
const getWeatherDef = toolDefinition({ name: 'get_weather', description: 'Get weather', inputSchema: z.object({ location: z.string() }) });

const getWeather = getWeatherDef.server(async ({ location }) => ({ temperature: 72, conditions: 'sunny' }));
```

---

## Message Parts Structure

Messages in TanStack AI are composed of parts that can represent different types of content such as text, thinking, or tool calls. This structure allows for rich chat interactions where the AI's reasoning process or function calls can be displayed distinctly. Understanding message parts is key to rendering complex chat UIs.

```typescript
message.parts.map((part, idx) => part.type === 'text' ? <span key={idx}>{part.content}</span> : null);

message.parts.map((part, idx) => part.type === 'thinking' ? <div key={idx}>Thinking: {part.content}</div> : null);
```

---

## Connection Adapters for Streaming

Connection adapters like fetchServerSentEvents in TanStack AI facilitate streaming responses from server endpoints using protocols like SSE. These adapters are used with hooks like useChat to establish real-time communication channels. They are critical for maintaining a responsive chat experience.

```typescript
import { fetchServerSentEvents } from '@tanstack/ai-react';
const connection = fetchServerSentEvents('/api/chat');

import { useChat } from '@tanstack/ai-react';
const chat = useChat({ connection: fetchServerSentEvents('/api/chat') });
```