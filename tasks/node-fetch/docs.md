# node-fetch Documentation

## Basic Fetch Requests

The fetch() function makes HTTP requests returning a Promise<Response>. Specify method, headers, and body in options for different request types. Check response.ok and status after fetch resolves.

```typescript
const res = await fetch('https://example.com');
if (res.ok) console.log(await res.text());

const res = await fetch('https://example.com', { method: 'POST', body: JSON.stringify({key: 'value'}) });
```

---

## Consuming Response Body

Use response.text(), json(), or arrayBuffer() to parse the entire body. For efficiency, stream with response.body as ReadableStream supporting async iteration.

```typescript
const data = await response.json();

for await (const chunk of response.body) { process(chunk); }
```

---

## Readable Stream Processing Methods

Readable streams provide forEach, map, filter, reduce for async chunk processing. These methods handle promises returned by callbacks and manage backpressure.

```typescript
await readable.forEach(chunk => console.log(chunk));

const result = await readable.map(chunk => chunk.toUpperCase()).toArray();
```

---

## Chaining Streams with pipeline

stream.pipeline() sequences streams and auto-closes on errors. Useful for fetch response.body to transforms or writables, but avoid with requests to prevent premature socket close.

```typescript
import { pipeline } from 'node:stream';
await pipeline(response.body, writable);

pipeline(readable, transform, writable, err => { if (err) throw err; });
```

---

## Undici Client for Connection Reuse

Undici's Client pools connections for a base URL, supporting HTTP/2 over TLS. Configure with options like keepAlive and headers for repeated requests.

```typescript
import { Client } from 'undici';
const client = new Client('https://example.com');
const res = await client.request({ path: '/api' });

const client = new Client('https://example.com', { keepAliveTimeout: 1000 });
```

---

## Proxy Support with ProxyAgent

ProxyAgent routes requests via a proxy, configurable as dispatcher option or global. Supports HTTP proxies and per-request overrides.

```typescript
import { ProxyAgent } from 'undici';
const agent = new ProxyAgent('http://proxy:8080');
fetch(url, { dispatcher: agent });

globalThis.fetch = (url, opts) => undici.fetch(url, { ...opts, dispatcher: agent });
```