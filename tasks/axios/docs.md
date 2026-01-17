# axios Documentation

## Basic HTTP Requests with Axios

Axios provides simple methods like axios.get(url, config) and axios.post(url, data, config) for making HTTP requests. These methods return promises that resolve to response objects containing data, status, and headers properties. They support both Promise chains and async/await syntax for handling responses.

```typescript
const response = await axios.get('/user?ID=12345'); console.log(response.data);

const response = await axios.post('/user', { firstName: 'Fred', lastName: 'Flintstone' });
```

---

## Request Configuration Options

Requests can include a config object specifying params for query strings, headers for authorization or content-type, timeout, baseURL, and more. Params are automatically serialized into the URL. Configuration overrides defaults and allows flexible request customization.

```typescript
axios.get('/user', { params: { ID: 12345 }, headers: { 'Authorization': 'Bearer token' } });

axios({ method: 'post', url: '/user', data: { name: 'John' }, timeout: 5000 });
```

---

## Creating Reusable Axios Instances

axios.create(config) produces an instance with predefined defaults like baseURL, timeout, and headers. Instances behave like the main axios object and support modifying defaults post-creation. Request configs override instance defaults for flexibility.

```typescript
const api = axios.create({ baseURL: 'https://api.example.com', timeout: 10000 }); api.get('/users');

const instance = axios.create({ headers: { 'X-Custom': 'value' } }); instance.defaults.headers.common['Auth'] = 'token';
```

---

## Request and Response Interceptors

Interceptors on axios or instances allow global modification of requests before sending and responses before fulfillment. Request interceptors receive and return config; response interceptors handle success or errors. Interceptors can be ejected or cleared.

```typescript
axios.interceptors.request.use(config => { config.headers.Authorization = 'Bearer token'; return config; });

axios.interceptors.response.use(response => response, error => Promise.reject(error));
```

---

## Handling Errors in Axios Requests

Errors provide error.response for server errors (4xx/5xx), error.request for no response, and error.message for setup issues. Use try/catch with async/await or .catch() with promises. axios.isAxiosError checks for Axios-specific errors.

```typescript
try { await axios.get('/user'); } catch (error) { if (error.response) console.log(error.response.status); }

axios.get('/user').catch(error => { if (error.request) console.log('No response'); });
```

---

## Cancelling Requests with AbortController

Include { signal: new AbortController().signal } in config to enable cancellation. Call controller.abort() to cancel; errors are AxiosError with code 'ERR_CANCELED'. Check with axios.isCancel(error) in catch blocks.

```typescript
const controller = new AbortController(); axios.get('/foo', { signal: controller.signal }); controller.abort();

if (axios.isCancel(error)) { console.log('Request cancelled'); }
```

---

## Executing Concurrent Requests

Use native Promise.all to run multiple axios requests in parallel, receiving an array of responses. Destructure results for easy access. Errors from any request reject the entire Promise.all.

```typescript
Promise.all([axios.get('/user'), axios.get('/posts')]).then(([user, posts]) => console.log(user.data, posts.data));

const [acct, perm] = await Promise.all([axios.get('/account'), axios.get('/permissions')]);
```