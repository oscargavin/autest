import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Context7 } from '@upstash/context7-sdk';
import { generateText } from './llm.js';
import type { TaskSet, DocSection, Task } from './types.js';

const GENERATION_TOPICS = [
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

async function generateTaskSuite(libraryName: string, libraryIdOverride?: string): Promise<void> {
  console.log(`\n🚀 Generating test suite for: ${libraryName}\n`);

  // Step 1: Fetch documentation with Context7
  const context7 = new Context7();
  const libraryId = libraryIdOverride || await resolveLibraryId(context7, libraryName);
  const context = await fetchDocumentation(context7, libraryId, GENERATION_TOPICS);

  // Step 2: Generate tasks with Grok
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(libraryName, libraryId, context);

  console.log('📚 Generating tasks with Grok...\n');

  const fullResponse = await generateText(systemPrompt, userPrompt);

  // Step 2: Extract JSON from response
  console.log('\n📝 Parsing generated output...\n');
  const generated = extractJSON(fullResponse);

  if (!generated) {
    console.error('❌ Failed to extract valid JSON from response');
    console.log('Raw response:', fullResponse.slice(0, 500));
    process.exit(1);
  }

  // Step 3: Validate output
  validateOutput(generated);

  // Step 4: Write files
  const taskSet: TaskSet = {
    library: libraryName,
    libraryId: `/${libraryName.replace('-', '/')}`, // tanstack-ai -> /tanstack/ai
    generatedAt: new Date().toISOString(),
    docs: generated.docs,
    tasks: generated.tasks
  };

  const outDir = `./tasks/${libraryName}`;
  mkdirSync(outDir, { recursive: true });

  writeFileSync(`${outDir}/tasks.json`, JSON.stringify(taskSet, null, 2));

  const docsContent = generated.docs.map(d =>
    `## ${d.title}\n\n${d.content}\n\n\`\`\`typescript\n${d.codeExamples.join('\n\n')}\n\`\`\``
  ).join('\n\n---\n\n');
  writeFileSync(`${outDir}/docs.md`, `# ${libraryName} Documentation\n\n${docsContent}`);

  // Print summary
  console.log('✅ Generation complete!\n');
  console.log(`  📁 Output: ${outDir}/`);
  console.log(`  📄 Doc sections: ${generated.docs.length}`);
  console.log(`  🧪 Tasks: ${generated.tasks.length}`);

  const distribution = new Map<string, number>();
  for (const task of generated.tasks) {
    distribution.set(task.docTag, (distribution.get(task.docTag) || 0) + 1);
  }

  console.log('\n  Task distribution:');
  for (const [tag, count] of distribution) {
    console.log(`    ${tag}: ${count}`);
  }
}

function buildSystemPrompt(): string {
  return `You are a test suite generator for evaluating how well AI models can use library APIs.

Your job:
1. Generate a structured test suite from provided documentation

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
- Extract patterns from the provided documentation

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

After generating the suite, output ONLY the JSON object.`;
}

async function resolveLibraryId(client: Context7, libraryName: string): Promise<string> {
  const response = await client.searchLibrary(`Docs for ${libraryName}`);
  const results = response.results;
  if (!results.length) {
    throw new Error(`No Context7 library match for ${libraryName}`);
  }
  return results[0].id;
}

async function fetchDocumentation(
  client: Context7,
  libraryId: string,
  topics: string[]
): Promise<string> {
  const sections: string[] = [];

  for (const topic of topics) {
    const response = await client.getDocs(libraryId, {
      format: 'txt',
      topic,
      mode: 'info'
    });
    sections.push(`## ${topic}\n\n${response.content}`);
  }

  return sections.join('\n\n---\n\n');
}

function buildUserPrompt(libraryName: string, libraryId: string, context: string): string {
  return `Generate a test suite for the library: ${libraryName}
Library ID: ${libraryId}

Documentation context:
${context}

Generate 5-7 doc sections and 20-25 tasks. Output the final JSON.
Remember: Output ONLY the JSON object at the end, no markdown code blocks.`;
}

function extractJSON(text: string): GeneratedOutput | null {
  // First try: find JSON between code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Second try: find JSON object starting with { "docs"
  const jsonStartMatch = text.match(/\{\s*"docs"\s*:/);
  if (jsonStartMatch && jsonStartMatch.index !== undefined) {
    const jsonStart = jsonStartMatch.index;
    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd > jsonStart) {
      try {
        return JSON.parse(text.slice(jsonStart, jsonEnd));
      } catch {}
    }
  }

  // Third try: parse the whole thing
  try {
    return JSON.parse(text.trim());
  } catch {}

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
    if (!docIds.has(task.docTag)) {
      console.warn(`⚠️  Task ${task.id} references unknown docTag: ${task.docTag}`);
    }
  }

  console.log(`  ✓ Validated ${docs.length} doc sections`);
  console.log(`  ✓ Validated ${tasks.length} tasks`);
}

async function main() {
  const libraryName = process.argv[2];
  const libraryIdOverride = process.argv[3];

  if (!libraryName) {
    console.error('Usage: npm run autogen -- <library-name> [context7-library-id]');
    console.error('Example: npm run autogen -- tanstack-ai');
    console.error('Example: npm run autogen -- node-fetch /nodejs/node');
    process.exit(1);
  }

  try {
    await generateTaskSuite(libraryName, libraryIdOverride);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    if (error instanceof Error) {
      console.log('Hint: pass a Context7 library ID as a second argument.');
    }
    process.exit(1);
  }
}

main();
