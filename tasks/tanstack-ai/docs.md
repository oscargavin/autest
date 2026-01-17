# tanstack-ai Documentation

## useChat Hook Basics

The useChat hook from @tanstack/ai-react manages chat state including messages, loading states, and errors. It connects to a server endpoint via fetchServerSentEvents and automatically handles streaming responses. The hook returns messages, sendMessage, isLoading, error, reload, and stop utilities.

```typescript
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react';

const { messages, sendMessage, isLoading } = useChat({
  connection: fetchServerSentEvents('/api/chat')
});

const handleSubmit = (e) => {
  e.preventDefault();
  if (input.trim() && !isLoading) {
    sendMessage(input);
    setInput('');
  }
};
```

---

## Message Parts Structure

Messages contain an array of parts with different types: 'text' for regular content, 'thinking' for model reasoning (UI-only), 'tool-call' for function invocations, and 'tool-result' for execution outputs. Each part type has a specific structure with type-specific properties like content, arguments, or output.

```typescript
type MessagePart = TextPart | ThinkingPart | ToolCallPart | ToolResultPart;

interface TextPart {
  type: 'text';
  content: string;
}

interface ThinkingPart {
  type: 'thinking';
  content: string;
}

message.parts.map((part) => {
  if (part.type === 'text') return <span>{part.content}</span>;
  if (part.type === 'thinking') return <em>{part.content}</em>;
  return null;
})
```

---

## Server-Side Streaming with SSE

Server endpoints use the chat function with an adapter and convert streams to SSE responses using toServerSentEventsResponse. The server accepts POST requests with messages, processes them through an AI adapter, and returns a stream with proper Content-Type and Cache-Control headers.

```typescript
import { chat, toServerSentEventsResponse } from '@tanstack/ai';
import { openaiText } from '@tanstack/ai-openai';

export async function POST(request) {
  const { messages } = await request.json();
  const stream = chat({ adapter: openaiText('gpt-4o'), messages });
  return toServerSentEventsResponse(stream);
}
```

---

## Provider Adapters Configuration

TanStack AI supports multiple providers through tree-shakeable adapters: openaiText, anthropicText, geminiText, and ollamaText. Each adapter accepts configuration like API keys or host URLs and returns a provider instance that can be passed to the chat function.

```typescript
import { openaiText } from '@tanstack/ai-openai';
import { anthropicText } from '@tanstack/ai-anthropic';
import { ollamaText } from '@tanstack/ai-ollama';

const openai = openaiText({ apiKey: process.env.OPENAI_API_KEY });
const claude = anthropicText({ apiKey: process.env.ANTHROPIC_API_KEY });
const ollama = ollamaText({ host: 'http://localhost:11434' });

const stream = chat({
  adapter: openaiText({ apiKey: key }),
  model: 'gpt-4o',
  messages
});
```

---

## Tool Definition with Zod

Tools are defined using toolDefinition with name, description, and Zod schemas for input/output validation. The definition can be implemented for server-side (.server()) or client-side (.client()) execution, enabling isomorphic tool usage across environments.

```typescript
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

const getWeatherDef = toolDefinition({
  name: 'get_weather',
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string(),
    unit: z.enum(['celsius', 'fahrenheit']).optional()
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string()
  })
});

const getWeatherServer = getWeatherDef.server(async ({ location, unit }) => {
  const data = await fetchWeather(location, unit);
  return { temperature: data.temp, conditions: data.cond };
});
```

---

## Connection Adapters

Connection adapters handle client-server communication. fetchServerSentEvents creates a POST connection to an SSE endpoint, while stream() connects to server functions. Both adapters handle streaming responses and parse chunks automatically.

```typescript
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react';

const chat = useChat({
  connection: fetchServerSentEvents('/api/chat')
});

import { useChat, stream } from '@tanstack/ai-react';

const chat = useChat({
  connection: stream((messages) => serverChatFunction({ messages }))
});
```

---

## Chat Lifecycle Callbacks

The useChat hook supports lifecycle callbacks: onChunk for processing individual stream chunks, onFinish for handling completed messages, and onError for error handling. These callbacks enable analytics, logging, and custom side effects during chat interactions.

```typescript
const { messages, sendMessage } = useChat({
  connection: fetchServerSentEvents('/api/chat'),
  onChunk: (chunk) => {
    if (chunk.type === 'content') console.log('Token:', chunk.delta);
  },
  onFinish: (message) => {
    console.log('Complete:', message);
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```