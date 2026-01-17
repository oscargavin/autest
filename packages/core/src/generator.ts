import { createMCPClient } from '@ai-sdk/mcp';
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio';
import { xai } from '@ai-sdk/xai';
import { generateText, stepCountIs } from 'ai';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { TaskSet, DocSection, Task, ProgressCallback } from './types.js';

const DEFAULT_TOPICS = [
  'hooks API useChat usage examples streaming',
  'server-side chat function streaming SSE response',
  'provider adapters openai anthropic ollama configuration',
  'tool definition toolDefinition function calling zod schema',
  'message parts structure text thinking tool_call',
  'connection adapters fetchServerSentEvents stream'
];

interface GeneratedOutput {
  docs: DocSection[];
  tasks: Task[];
}

export interface GenerateOptions {
  library: string;
  topics?: string[];
  outputDir?: string;
  onProgress?: ProgressCallback;
}

export async function generateTaskSuite(options: GenerateOptions): Promise<TaskSet> {
  const { library, topics = DEFAULT_TOPICS, outputDir = './tasks', onProgress } = options;

  const emit = (stage: string, percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  emit('init', 0, `Starting generation for ${library}`);

  // Create MCP client for Context7
  emit('mcp', 5, 'Connecting to Context7 MCP server...');

  const mcpClient = await createMCPClient({
    transport: new Experimental_StdioMCPTransport({
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp']
    })
  });

  try {
    const tools = await mcpClient.tools();
    emit('mcp', 10, `Connected, ${Object.keys(tools).length} tools available`);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(library, topics);

    emit('generate', 15, 'Generating tasks with Grok + Context7...');

    let stepCount = 0;
    const { text, steps } = await generateText({
      model: xai('grok-4-1-fast-reasoning'),
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(10),
      onStepFinish: ({ toolCalls }) => {
        stepCount++;
        for (const call of toolCalls) {
          emit('generate', Math.min(20 + stepCount * 5, 65), `Tool: ${call.toolName}`);
        }
      }
    });

    emit('parse', 70, `Generation complete (${steps.length} steps), parsing...`);

    // Extract JSON from response
    const generated = extractJSON(text);

    if (!generated) {
      throw new Error('Failed to extract valid JSON from response');
    }

    // Validate output
    validateOutput(generated);
    emit('validate', 80, `Validated ${generated.docs.length} docs, ${generated.tasks.length} tasks`);

    // Build TaskSet
    const taskSet: TaskSet = {
      library,
      libraryId: `/${library.replace('-', '/')}`,
      generatedAt: new Date().toISOString(),
      docs: generated.docs,
      tasks: generated.tasks
    };

    // Write files
    emit('write', 90, 'Writing output files...');
    const outPath = `${outputDir}/${library}`;
    mkdirSync(outPath, { recursive: true });

    writeFileSync(`${outPath}/tasks.json`, JSON.stringify(taskSet, null, 2));

    const docsContent = generated.docs.map(d =>
      `## ${d.title}\n\n${d.content}\n\n\`\`\`typescript\n${d.codeExamples.join('\n\n')}\n\`\`\``
    ).join('\n\n---\n\n');
    writeFileSync(`${outPath}/docs.md`, `# ${library} Documentation\n\n${docsContent}`);

    emit('done', 100, `Complete: ${generated.docs.length} docs, ${generated.tasks.length} tasks`);

    return taskSet;

  } finally {
    await mcpClient.close();
  }
}

function buildSystemPrompt(): string {
  return `You are a test suite generator for evaluating how well AI models can use library APIs.

Your job:
1. Use the Context7 MCP tools to fetch documentation for a library
2. Generate a structured test suite from that documentation

OUTPUT FORMAT:
Return a JSON object with this exact structure (no markdown code blocks around it):

{
  "docs": [
    {
      "id": "unique-id",
      "title": "Section Title",
      "content": "2-4 sentences explaining the concept",
      "codeExamples": ["code example 1", "code example 2"]
    }
  ],
  "tasks": [
    {
      "id": "task-001",
      "docTag": "unique-id",
      "description": "Write a function X that does Y",
      "difficulty": "easy|medium|hard",
      "testCode": "full test code here",
      "solutionHint": "brief hint about the solution"
    }
  ]
}

RULES FOR DOC SECTIONS:
- Create 5-7 focused sections covering the main API surface
- Each section should teach ONE concept
- Keep content concise (2-4 sentences max)
- Include 1-2 minimal code examples per section
- Extract patterns from the Context7 documentation

RULES FOR TASKS:
- Generate 3-4 tasks per doc section (20-25 total)
- Each task tests ONE specific concept
- Difficulty levels:
  - easy: single function, obvious solution
  - medium: 2-3 concepts combined
  - hard: edge cases, complex logic
- Task IDs: task-001, task-002, etc.
- docTag must reference a valid doc section id

RULES FOR TEST CODE:
- Use node:test and node:assert ONLY (no external dependencies)
- Mock ALL externals at the top (globalThis.fetch, globalThis.useChat, etc.)
- Capture arguments to verify correct usage
- Include 2-3 test cases per task
- Tests must be self-contained and runnable
- NO real network calls or external dependencies

EXAMPLE TEST CODE STRUCTURE:
\`\`\`
import { test } from 'node:test';
import assert from 'node:assert';

// Mock globals
let capturedArgs;
globalThis.someFunction = (args) => { capturedArgs = args; return mockResult; };

test('function does X correctly', () => {
  const result = functionUnderTest(input);
  assert.strictEqual(result, expected);
  assert.strictEqual(capturedArgs.property, expectedValue);
});
\`\`\`

After fetching docs and generating the suite, output ONLY the JSON object.`;
}

function buildUserPrompt(libraryName: string, topics: string[]): string {
  return `Generate a test suite for the library: ${libraryName}

Steps:
1. First, use resolve-library-id to find the Context7 library ID for "${libraryName}"
2. Then, use query-docs to fetch documentation for these topics:
${topics.map(t => `   - ${t}`).join('\n')}
3. Generate 5-7 doc sections and 20-25 tasks based on the documentation
4. Output the final JSON

Remember: Output ONLY the JSON object at the end, no markdown code blocks.`;
}

function extractJSON(text: string): GeneratedOutput | null {
  // Try multiple extraction strategies
  const strategies = [
    // 1. JSON in code blocks
    () => {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      return match ? JSON.parse(match[1].trim()) : null;
    },
    // 2. Find { "docs" pattern and extract balanced braces
    () => {
      const match = text.match(/\{\s*"docs"\s*:/);
      if (!match?.index) return null;
      return extractBalancedJSON(text, match.index);
    },
    // 3. Find { "tasks" pattern (in case order is reversed)
    () => {
      const match = text.match(/\{\s*"tasks"\s*:/);
      if (!match?.index) return null;
      return extractBalancedJSON(text, match.index);
    },
    // 4. Find any { followed by " (start of JSON object)
    () => {
      const match = text.match(/\{\s*"/);
      if (!match?.index) return null;
      return extractBalancedJSON(text, match.index);
    },
    // 5. Whole response
    () => JSON.parse(text.trim())
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (result && result.docs && result.tasks) {
        return result;
      }
    } catch {}
  }

  // Log failure for debugging
  console.error('[extractJSON] Failed to extract. Response preview:', text.slice(0, 500));
  return null;
}

function extractBalancedJSON(text: string, start: number): GeneratedOutput | null {
  let braceCount = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return JSON.parse(text.slice(start, i + 1));
        }
      }
    }
  }

  return null;
}

function validateOutput(output: GeneratedOutput): void {
  const { docs, tasks } = output;

  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error('No doc sections generated');
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('No tasks generated');
  }

  const docIds = new Set(docs.map(d => d.id));

  for (const task of tasks) {
    if (!task.id || !task.docTag || !task.description || !task.testCode) {
      throw new Error(`Invalid task: ${JSON.stringify(task).slice(0, 100)}`);
    }
  }
}
