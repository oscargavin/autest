# @reactflow/core Documentation

## useReactFlow Hook

The useReactFlow hook returns a ReactFlowInstance object for programmatic interaction with the flow, such as querying nodes or manipulating the viewport. It should be called within a ReactFlowProvider context and added as a dependency in useEffect or useCallback due to async initialization. Common methods include getNodes(), fitView(), and addNodes().

```typescript
const reactFlow = useReactFlow();
const countNodes = useCallback(() => {
  setCount(reactFlow.getNodes().length);
}, [reactFlow]);

const reactFlowInstance = useReactFlow();
const fitView = () => {
  reactFlowInstance.fitView();
};
```

---

## useNodesState and useEdgesState Hooks

useNodesState and useEdgesState are custom hooks for managing nodes and edges state in React Flow apps. Each returns a tuple: current state array, setter function, and onChange handler. They simplify state updates and provide change handlers for the ReactFlow component.

```typescript
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

<ReactFlow 
  nodes={nodes} 
  onNodesChange={onNodesChange} 
  edges={edges} 
  onEdgesChange={onEdgesChange} />
```

---

## ReactFlow Component

ReactFlow is the main canvas component that renders nodes and edges. Key props include nodes, edges, onNodesChange, onEdgesChange, fitView, nodeTypes, and edgeTypes. It supports nested components like Background and Controls for enhanced UI.

```typescript
<ReactFlow 
  nodes={nodes} 
  edges={edges} 
  onNodesChange={onNodesChange} 
  onEdgesChange={onEdgesChange} 
  fitView />

<ReactFlow ...>
  <Background />
  <Controls />
</ReactFlow>
```

---

## addEdge Utility

addEdge takes a Connection object and existing edges array, returning a new array with the connection upgraded to a full Edge. It prevents duplicate edges and sets default properties. Primarily used inside setEdges updater in onConnect callbacks.

```typescript
const onConnect = useCallback(
  (connection) => setEdges((eds) => addEdge(connection, eds)),
  [setEdges]
);

setEdges((oldEdges) => addEdge({source: '1', target: '2'}, oldEdges));
```

---

## onConnect Callback

onConnect is a prop on ReactFlow triggered when users connect node handles. It receives a Connection {source, target, sourceHandle, targetHandle}. Implement it to validate and add the edge using addEdge.

```typescript
const onConnect = (connection) => {
  console.log(connection.source, '->', connection.target);
  setEdges((eds) => addEdge(connection, eds));
};

<ReactFlow onConnect={onConnect} />
```

---

## Custom Node Types

Custom nodes extend default rendering by mapping type strings to React components via nodeTypes prop. Custom components receive the full node object {id, type, position, data}. Define initial nodes with type: 'custom'.

```typescript
const nodeTypes = { custom: CustomNode };
<ReactFlow nodeTypes={nodeTypes} />

{ id: '1', type: 'custom', position: {x: 0, y: 0}, data: {label: 'Node'} }
```

---

## useNodes Hook

useNodes returns the current nodes array and subscribes the component to re-render on any node changes like position or selection. Ideal for read-only displays of node data. Does not take arguments.

```typescript
const nodes = useNodes();
return <div>{nodes.length} nodes</div>;

{nodes.map((node) => (
  <li key={node.id}>{node.id}</li>
))}
```