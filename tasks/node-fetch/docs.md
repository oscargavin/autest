# node-fetch Documentation

## Basic GET Request

The fetch() function makes HTTP requests. For GET requests, call fetch(url) and await the response. Check res.ok for success. Use res.json() to parse JSON responses.

```javascript
const res = await fetch('https://api.example.com/data');
if (res.ok) {
  const data = await res.json();
  console.log(data);
}
```

---

## POST with JSON Body

To send JSON data, pass an options object with method: 'POST', headers with 'Content-Type': 'application/json', and body: JSON.stringify(data).

```javascript
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});
const created = await res.json();
```

---

## Working with Headers

Response headers are accessed via res.headers. Use res.headers.get('header-name') to retrieve specific headers. You can also iterate over headers. To send custom headers, include a headers object in the request options.

```javascript
const res = await fetch('https://api.example.com');
const contentType = res.headers.get('content-type');
console.log(contentType);

const res = await fetch('https://api.example.com', {
  headers: { 'Authorization': 'Bearer token123' }
});
```

---

## Handling Status Codes

res.status gives the numeric HTTP status code (200, 404, etc). res.ok is true for 2xx responses. res.statusText gives the status message. The url property contains the final URL after redirects.

```javascript
const res = await fetch(url);
if (res.status === 404) {
  console.log('Not found');
} else if (res.ok) {
  const data = await res.json();
}
console.log('Final URL:', res.url);
```

---

## Request Cancellation with AbortController

Use AbortController to cancel requests. Create controller with new AbortController(), pass controller.signal to fetch options, call controller.abort() to cancel. The abort throws an error with name 'AbortError'.

```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

try {
  const res = await fetch(url, { signal: controller.signal });
  const data = await res.json();
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Request was cancelled');
  }
}
```

---

## Reading Response as Text

Use res.text() to read the response body as a string instead of JSON. Use res.blob() for binary data. Use res.arrayBuffer() for raw bytes. The body can only be consumed once.

```javascript
const res = await fetch('https://example.com');
const html = await res.text();
console.log(html);

const res = await fetch('https://example.com/image.png');
const blob = await res.blob();
```