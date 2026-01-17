# socket.io Documentation

## Server Initialization

Socket.IO server is initialized by creating an HTTP server and passing it to the Server constructor. Optional configuration like CORS or adapter can be provided. Handle incoming connections via io.on('connection', handler).

```typescript
import { createServer } from 'http'; import { Server } from 'socket.io'; const httpServer = createServer(); const io = new Server(httpServer); io.on('connection', (socket) => {}); httpServer.listen(3000);

const io = new Server(httpServer, { cors: { origin: '*' } });
```

---

## Client Connection

Clients connect to the server using the io() function with the server URL. It returns a socket instance for event handling. Listen to 'connect' event to confirm successful connection.

```typescript
import io from 'socket.io-client'; const socket = io('http://localhost:3000');

socket.on('connect', () => { console.log('connected'); });
```

---

## Event Emission and Listeners

Attach listeners with socket.on('event', handler) on both server and client. Emit events using socket.emit('event', data). Supports namespace and room targeting for selective emission.

```typescript
socket.on('hello', (arg) => { console.log(arg); });

socket.emit('hello', 'world');
```

---

## Event Acknowledgements

Enable request-response by passing a callback to emit: socket.emit('event', data, cb). Call cb(response) in the handler to acknowledge. Use emitWithAck() for promise-based handling.

```typescript
socket.emit('hi', (response) => { console.log(response); });

socket.on('hi', (cb) => { cb('hola'); });
```

---

## Rooms and Broadcasting

Sockets join rooms via socket.join('room'). Broadcast to rooms with io.to('room').emit('event'). Exclude rooms using except('room') or broadcast to all except sender with socket.broadcast.emit().

```typescript
socket.join('room1'); io.to('room1').emit('hello');

io.except('room1').emit('hello to others');
```

---

## Namespaces

Namespaces segment logic with io.of('/path'). They have independent rooms and connections. Clients connect with io('/path'). Rooms are local to each namespace.

```typescript
const nsp = io.of('/admin'); nsp.on('connection', (socket) => {});

const adminSocket = io('/admin');
```

---

## Connection Lifecycle

Server fires 'connection' on new socket. Handle 'disconnect' and 'disconnecting' events with reasons. Client has 'connect' and 'disconnect'. Use for cleanup and logging.

```typescript
io.on('connection', (socket) => { socket.on('disconnect', (reason) => {}); });

socket.on('disconnect', (reason) => { console.log(reason); });
```