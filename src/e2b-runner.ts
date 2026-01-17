import { Sandbox } from '@e2b/code-interpreter';

interface TestResult {
  passed: boolean;
  output: string;
}

export async function runTestsInSandbox(code: string, testCode: string): Promise<TestResult> {
  if (!process.env.E2B_API_KEY) {
    throw new Error('E2B_API_KEY is required');
  }

  const fullCode = `${code}\n\n${testCode}`;
  const testFile = `/home/user/temp-test-${Date.now()}.mjs`;
  const sandbox = await Sandbox.create({ timeoutMs: 60_000 });

  try {
    await sandbox.files.write(testFile, fullCode);
    const result = await sandbox.commands.run(`node --test ${testFile}`);
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    return { passed: result.exitCode === 0, output };
  } catch (error) {
    return { passed: false, output: String(error) };
  } finally {
    await sandbox.kill();
  }
}
