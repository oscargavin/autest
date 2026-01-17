# ink Documentation

## useStdout Hook

The useStdout hook provides access to the stdout stream and a write method for printing strings above Ink's main output area without disrupting the UI rendering. It returns an object containing the stdout stream and the write function. This is particularly useful for logging status updates or informational messages in CLI apps.

```typescript
import {useStdout} from 'ink';
const {write} = useStdout();
write('Hello from stdout\n');

import React, {useEffect} from 'react';
import {useStdout} from 'ink';
const Demo = () => {
  const {write} = useStdout();
  useEffect(() => write('Logged on mount\n'), []);
  return null;
};
```

---

## useStderr Hook

Similar to useStdout, the useStderr hook exposes the stderr stream and a write method for error logging. Output appears above the Ink UI on stderr. It separates error messages from standard output effectively.

```typescript
import {useStderr} from 'ink';
const {write} = useStderr();
write('Error message\n');

import React, {useEffect} from 'react';
import {useStderr} from 'ink';
const ErrorDemo = () => {
  const {write} = useStderr();
  useEffect(() => write('Error on mount\n'), []);
  return null;
};
```

---

## useStdin Hook

The useStdin hook gives access to the stdin stream, setRawMode function, and isRawModeSupported boolean. It enables raw input mode for capturing unprocessed keyboard data. Always clean up by disabling raw mode.

```typescript
import {useStdin} from 'ink';
const {stdin, setRawMode, isRawModeSupported} = useStdin();

import React, {useEffect} from 'react';
import {useStdin} from 'ink';
function Demo() {
  const {setRawMode, isRawModeSupported} = useStdin();
  useEffect(() => {
    if (isRawModeSupported) setRawMode(true);
  }, []);
}
```

---

## Raw Mode Input Handling

In raw mode via useStdin, listen to stdin 'data' events to process raw key bytes. Convert data Buffer to string or hex for key identification. Handle cleanup in useEffect return to prevent input issues.

```typescript
const {stdin} = useStdin();
stdin.on('data', (data) => {
  console.log(Buffer.from(data).toString('hex'));
});

useEffect(() => {
  const handler = (data) => { /* handle */ };
  stdin.on('data', handler);
  return () => stdin.removeListener('data', handler);
}, [stdin]);
```

---

## Preserving Output with Stream Writes

Both useStdout.write and useStderr.write append raw strings to their respective streams above the Ink frame. Unlike Static, they only accept strings, not JSX. Output persists across frames like static content.

```typescript
const {write} = useStdout();
write('Persistent log\n');

const {write} = useStderr();
const timer = setInterval(() => write(`Log ${Date.now()}\n`), 1000);
```

---

## ARIA Accessibility in Ink Components

Ink's Box and Text components support ARIA attributes like aria-role, aria-state, and aria-label for screen reader compatibility. Use aria-state objects for dynamic states like checked or disabled. Pair with useIsScreenReaderEnabled for conditional verbose output.

```typescript
<Box aria-role="checkbox" aria-state={{checked: true}}>
  <Text>Accept terms</Text>
</Box>

<Box aria-role="button" aria-label="Submit">
  <Text>Submit</Text>
</Box>
```