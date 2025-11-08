# Troubleshooting Guide

## Installation Issues

### "npm install" fails

**Problem:** Dependencies fail to install

**Solutions:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   npm install
   ```

2. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Use a different package manager:
   ```bash
   yarn install
   # or
   pnpm install
   ```

4. Check Node.js version (requires Node 16+):
   ```bash
   node --version
   ```

### Security vulnerabilities warning

**Problem:** npm audit shows vulnerabilities

**Note:** These are typically in dev dependencies and don't affect the built app.

**Solutions:**
1. Review vulnerabilities:
   ```bash
   npm audit
   ```

2. Attempt automatic fix:
   ```bash
   npm audit fix
   ```

3. For breaking changes (use carefully):
   ```bash
   npm audit fix --force
   ```

## Development Server Issues

### Server won't start

**Problem:** `npm run dev` fails

**Solutions:**
1. Port 3000 might be in use. Vite will try alternative ports automatically.

2. Check for error messages in console

3. Verify vite.config.js exists

4. Try clearing Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### "Cannot find module" errors

**Problem:** Import errors in console

**Solutions:**
1. Ensure all files are created (check project structure)

2. Verify file extensions (.jsx vs .js)

3. Check import paths (relative vs absolute)

4. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Hot reload not working

**Problem:** Changes don't appear automatically

**Solutions:**
1. Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)

2. Restart dev server

3. Check browser console for errors

4. Disable browser extensions

## Canvas/React Flow Issues

### Canvas is blank

**Problem:** White/empty screen instead of workflow canvas

**Solutions:**
1. Open browser DevTools (F12) and check console for errors

2. Verify React Flow styles are imported:
   ```jsx
   import '@xyflow/react/dist/style.css';
   ```

3. Check that parent div has width and height:
   ```css
   .workflow-canvas {
     flex: 1;
     position: relative;
   }
   ```

4. Ensure React Flow component has proper structure:
   ```jsx
   <ReactFlow nodes={nodes} edges={edges} ... />
   ```

### Nodes not appearing

**Problem:** Added nodes don't show on canvas

**Solutions:**
1. Check browser console for errors

2. Verify node has all required properties:
   ```javascript
   {
     id: string,
     type: string,
     position: { x: number, y: number },
     data: { label, type, properties }
   }
   ```

3. Ensure node type is registered in nodeTypes:
   ```javascript
   const nodeTypes = {
     'webhook': WorkflowNode,
     // ... other types
   };
   ```

4. Check that WorkflowNode component exists

### Can't connect nodes

**Problem:** Dragging from handle doesn't create edge

**Solutions:**
1. Ensure handles are present in WorkflowNode component

2. Check handle types match:
   - Source handle: `type="source"`
   - Target handle: `type="target"`

3. Verify onConnect callback is defined:
   ```javascript
   const onConnect = useCallback((params) => {
     setEdges((eds) => addEdge(params, eds));
   }, []);
   ```

4. Check React Flow component has onConnect prop:
   ```jsx
   <ReactFlow onConnect={onConnect} ... />
   ```

### Drag and drop not working

**Problem:** Can't drag nodes from library to canvas

**Solutions:**
1. Verify onDrop and onDragOver handlers:
   ```javascript
   const onDrop = useCallback((event) => {
     event.preventDefault();
     // ... logic
   }, [reactFlowInstance]);

   const onDragOver = useCallback((event) => {
     event.preventDefault();
     event.dataTransfer.dropEffect = 'move';
   }, []);
   ```

2. Ensure React Flow wrapper has ref:
   ```javascript
   const reactFlowWrapper = useRef(null);
   ```

3. Check ReactFlow instance is initialized:
   ```javascript
   <ReactFlow onInit={setReactFlowInstance} ... />
   ```

4. Verify draggable attribute on library nodes:
   ```jsx
   <div draggable onDragStart={handleDragStart}>
   ```

## Property Panel Issues

### Properties not updating

**Problem:** Changes in property panel don't affect node

**Solutions:**
1. Check updateNodeData callback is passed:
   ```jsx
   <PropertyPanel onUpdate={updateNodeData} />
   ```

2. Verify updateNodeData implementation:
   ```javascript
   const updateNodeData = useCallback((nodeId, newData) => {
     setNodes((nds) =>
       nds.map((node) =>
         node.id === nodeId
           ? { ...node, data: { ...node.data, ...newData } }
           : node
       )
     );
   }, []);
   ```

3. Check that selectedNode is passed correctly

4. Ensure property changes trigger re-render

### Properties not showing

**Problem:** Property panel is empty or incomplete

**Solutions:**
1. Verify node type definition exists in nodeTypes.js

2. Check node type has properties defined:
   ```javascript
   properties: {
     propName: {
       type: 'text',
       label: 'Label',
       // ...
     }
   }
   ```

3. Ensure PropertyPanel has node prop:
   ```jsx
   <PropertyPanel node={selectedNode} />
   ```

4. Check renderPropertyInput handles all property types

### Conditional fields not working

**Problem:** showIf conditions don't hide/show fields

**Solutions:**
1. Verify showIf syntax:
   ```javascript
   showIf: { method: ['POST', 'PUT'] }
   ```

2. Check condition evaluation logic in PropertyPanel

3. Ensure dependent field value is in properties state

## Execution Issues

### Execute button does nothing

**Problem:** Clicking execute doesn't run workflow

**Solutions:**
1. Check browser console for errors

2. Verify execution button is not disabled:
   ```jsx
   disabled={execution?.status === 'running'}
   ```

3. Ensure nodes array is not empty

4. Check executeWorkflow function:
   ```javascript
   const executeWorkflow = useCallback(async () => {
     await executionEngine.executeWorkflow(nodes, edges);
   }, [nodes, edges]);
   ```

### Execution doesn't show visual feedback

**Problem:** No animation or state changes during execution

**Solutions:**
1. Verify ExecutionEngine subscription in App.jsx:
   ```javascript
   useEffect(() => {
     const unsubscribe = executionEngine.subscribe((state) => {
       setExecution(state);
       // Update nodes...
     });
     return unsubscribe;
   }, []);
   ```

2. Check node updates in subscription callback

3. Ensure WorkflowNode component uses executionState:
   ```javascript
   const executionState = data.executionState;
   ```

4. Verify animation CSS is present

### Execution viewer not appearing

**Problem:** Bottom panel doesn't show execution details

**Solutions:**
1. Check execution state is set:
   ```javascript
   setExecution(executionState);
   ```

2. Verify ExecutionViewer component is rendered:
   ```jsx
   {execution && <ExecutionViewer execution={execution} />}
   ```

3. Ensure ExecutionViewer receives execution prop

## Credentials Issues

### Credentials not saving

**Problem:** Created credentials disappear on refresh

**Solutions:**
1. Check localStorage is available:
   ```javascript
   console.log(localStorage.getItem('workflow_credentials'));
   ```

2. Verify browser allows localStorage (not in private mode)

3. Check credentialsManager.saveCredentials() is called

4. Ensure no localStorage quota exceeded

### Credentials not loading in dropdown

**Problem:** Credential selector is empty

**Solutions:**
1. Verify credential type matches:
   ```javascript
   credentialsManager.getCredentialsByType(propDef.credentialType)
   ```

2. Check credentials exist in localStorage

3. Ensure credentialsManager is imported correctly

4. Verify property type is 'credentials':
   ```javascript
   type: 'credentials',
   credentialType: 'httpAuth'
   ```

## Save/Load Issues

### Save doesn't download file

**Problem:** Save button doesn't trigger download

**Solutions:**
1. Check browser download settings/permissions

2. Verify save function creates download link:
   ```javascript
   const dataUri = 'data:application/json;charset=utf-8,' + 
                   encodeURIComponent(dataStr);
   linkElement.setAttribute('href', dataUri);
   linkElement.setAttribute('download', filename);
   linkElement.click();
   ```

3. Check browser console for errors

4. Try different browser

### Load doesn't import workflow

**Problem:** Loading JSON file doesn't restore workflow

**Solutions:**
1. Verify JSON file format:
   ```json
   {
     "nodes": [...],
     "edges": [...],
     "version": "1.0.0"
   }
   ```

2. Check file reader callback:
   ```javascript
   reader.onload = (event) => {
     const workflow = JSON.parse(event.target.result);
     setNodes(workflow.nodes || []);
     setEdges(workflow.edges || []);
   };
   ```

3. Ensure JSON is valid (use JSON validator)

4. Check browser console for parsing errors

## Styling Issues

### Styles not applying

**Problem:** UI looks broken or unstyled

**Solutions:**
1. Verify all CSS files are imported:
   ```jsx
   import '@xyflow/react/dist/style.css';
   import './App.css';
   import './index.css';
   ```

2. Check CSS file paths are correct

3. Clear browser cache (Ctrl+Shift+Delete)

4. Check for CSS syntax errors

### Layout issues

**Problem:** Components overlapping or misaligned

**Solutions:**
1. Check flex/grid containers have proper styles

2. Verify z-index values for layering

3. Ensure width/height are set on parents

4. Check for conflicting CSS rules

### Responsive issues

**Problem:** Layout breaks on different screen sizes

**Solutions:**
1. Test with browser DevTools device emulation

2. Check media queries in CSS

3. Verify flexible units (%, vh, vw) usage

4. Test on actual devices

## Performance Issues

### Slow rendering with many nodes

**Problem:** Canvas lags with 50+ nodes

**Solutions:**
1. Use React Flow's performance settings:
   ```jsx
   <ReactFlow nodesDraggable={!isExecuting} />
   ```

2. Implement node virtualization

3. Reduce animation complexity

4. Consider pagination or grouping

### Memory leaks

**Problem:** Browser becomes slow over time

**Solutions:**
1. Check for unsubscribed listeners:
   ```javascript
   useEffect(() => {
     const unsubscribe = subscribe();
     return unsubscribe; // Important!
   }, []);
   ```

2. Clear execution history periodically

3. Limit stored executions

4. Check browser memory in DevTools

## Browser-Specific Issues

### Safari issues

**Problem:** Features not working in Safari

**Solutions:**
1. Check for Safari-specific CSS

2. Verify JavaScript compatibility

3. Test localStorage access

4. Check for webkit-specific bugs

### Firefox issues

**Problem:** Different behavior in Firefox

**Solutions:**
1. Check drag and drop events

2. Verify CSS compatibility

3. Test flexbox/grid layouts

4. Check DevTools console

## Common Error Messages

### "Cannot read property 'x' of undefined"

**Cause:** Trying to access property of undefined/null object

**Solutions:**
1. Add null checks:
   ```javascript
   if (node?.data?.properties) { ... }
   ```

2. Use optional chaining: `node?.data?.type`

3. Provide default values: `properties || {}`

### "Maximum update depth exceeded"

**Cause:** Infinite render loop

**Solutions:**
1. Check useEffect dependencies

2. Verify callback memoization

3. Look for setState in render

4. Add proper dependency arrays

### "React Hook useCallback has missing dependency"

**Cause:** ESLint warning about dependencies

**Solutions:**
1. Add missing dependency to array

2. Use useRef for values that shouldn't trigger updates

3. Disable lint for specific line if intentional:
   ```javascript
   // eslint-disable-next-line react-hooks/exhaustive-deps
   ```

## Getting Help

### Debugging Steps

1. **Check Browser Console** (F12)
   - Look for red errors
   - Check network tab for failed requests
   - Verify localStorage contents

2. **Add Debug Logs**
   ```javascript
   console.log('Nodes:', nodes);
   console.log('Selected:', selectedNode);
   console.log('Execution:', execution);
   ```

3. **Isolate the Problem**
   - Does it happen with fresh install?
   - Is it browser-specific?
   - Can you reproduce consistently?

4. **Check Dependencies**
   ```bash
   npm list
   ```

5. **Verify File Integrity**
   - Ensure all files from project exist
   - Check for typos in imports
   - Verify file extensions

### Resources

- **React Flow Docs:** https://reactflow.dev/
- **React Docs:** https://react.dev/
- **Vite Docs:** https://vitejs.dev/
- **MDN Web Docs:** https://developer.mozilla.org/

### Reporting Issues

When reporting issues, include:

1. Error message (full text)
2. Browser and version
3. Node.js version (`node --version`)
4. Steps to reproduce
5. Expected vs actual behavior
6. Console errors (screenshot or text)
7. Relevant code snippets

---

Still having issues? Check the GitHub repository for similar issues or create a new one with details above!

