# tanstack-devtools Documentation

## Event Client Basics

The EventClient class enables type-safe communication between your application and devtools plugins. You define an event map interface with event names prefixed by your plugin ID, then extend EventClient with your custom types. Events can carry typed payloads or be void for simple notifications.

```typescript
import { EventClient } from '@tanstack/devtools-event-client'

interface MyEvents {
  'plugin:state-update': { count: number }
  'plugin:reset': void
}

class MyEventClient extends EventClient<MyEvents> {
  constructor() {
    super({ pluginId: 'plugin', debug: true })
  }
}

export const myClient = new MyEventClient()

myClient.emit('state-update', { count: 42 })
myClient.emit('reset', undefined)
```

---

## Event Listening and Subscription

Event clients provide subscription methods to listen for specific events or all plugin events. The `on` method subscribes to a specific event type and returns a cleanup function. The `onAllPluginEvents` method captures all events from the plugin for logging or debugging purposes.

```typescript
const cleanup = counterClient.on('state-update', (event) => {
  console.log('State:', event.payload)
})

// Later: cleanup()

const cleanupAll = counterClient.onAllPluginEvents((event) => {
  console.log(`Event: ${event.type}`)
})

// Later: cleanupAll()
```

---

## Server Event Bus

ServerEventBus manages server-side event communication via WebSocket and SSE endpoints. It can broadcast events to all connected clients and listen for client messages. The server runs on a configurable port (default 42069) and supports graceful shutdown.

```typescript
import { ServerEventBus } from '@tanstack/devtools-event-bus/server'

const bus = new ServerEventBus({ port: 42069, debug: true })
bus.start()

bus.on('client:message', (event) => {
  console.log('Received:', event)
})

bus.broadcast({
  type: 'server:response',
  payload: { message: 'Hello clients' }
})

process.on('SIGINT', () => {
  bus.stop()
  process.exit(0)
})
```

---

## Client Event Bus

ClientEventBus connects to the server event bus and enables cross-tab communication. It handles connection lifecycle events and supports both sending events to the server and broadcasting to other tabs via BroadcastChannel.

```typescript
import { ClientEventBus } from '@tanstack/devtools-event-bus/client'

const eventBus = new ClientEventBus({
  connectToServerBus: true,
  debug: true,
  port: 42069
})

eventBus.start()

eventBus.on('connected', () => console.log('Connected'))
eventBus.send({ type: 'my-app:event', payload: { data: 'value' } })
eventBus.stop()
```

---

## Plugin Configuration

Plugins are configured with an id, name, and render function. The name can be a string or function that receives the mount element. The render function receives the element and current theme to generate the plugin's UI.

```typescript
const plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  defaultOpen: true,
  render: (el, theme) => {
    el.innerHTML = `<div>Plugin UI (${theme} mode)</div>`
  }
}

const dynamicPlugin = {
  id: 'dynamic',
  name: (el) => { el.innerText = 'Dynamic Name' },
  render: (el) => { el.innerHTML = '<div>Content</div>' }
}
```

---

## React Devtools Integration

TanStackDevtools component accepts a plugins array and configuration options. Each plugin specifies its panel component and optional settings like defaultOpen. Multiple TanStack library devtools can be composed together.

```typescript
import { TanStackDevtools } from '@tanstack/react-devtools'

function App() {
  return (
    <>
      <YourApp />
      <TanStackDevtools plugins={[{
        name: 'My Plugin',
        render: <MyPanel />,
        defaultOpen: true
      }]} />
    </>
  )
}
```

---

## Devtools Core API

TanStackDevtoolsCore provides the framework-agnostic core for managing devtools instances. It supports dynamic configuration updates, mounting/unmounting to DOM elements, and integrating with the event bus system. Configuration includes position, theme, hotkeys, and behavior options.

```typescript
import { TanStackDevtoolsCore } from '@tanstack/devtools'

const devtools = new TanStackDevtoolsCore({
  config: {
    defaultOpen: false,
    position: 'bottom-right',
    theme: 'dark',
    openHotkey: ['Shift', 'A']
  },
  plugins: [/* ... */]
})

devtools.mount(container)

devtools.setConfig({
  config: { theme: 'light', position: 'top-right' }
})

devtools.unmount()
```