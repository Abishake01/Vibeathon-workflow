# 🎯 Drag & Drop Fix - Testing Instructions

## ✅ Changes Applied

I've added **enhanced debugging** and **CSS fixes** to make drag and drop work properly:

### 1. **Enhanced Console Logging**
Added detailed logs to diagnose the exact issue:
- GrapesJS CSS loading status
- Block rendering status
- Block element styles (cursor, pointer-events, draggable)
- Canvas and frame element details

### 2. **CSS Improvements**
Added critical CSS to ensure drag interactions work:
- **Blocks**: `cursor: grab`, `pointer-events: auto`
- **Canvas**: `pointer-events: auto` on all canvas elements
- **Interactive elements**: Ensured all child elements can receive pointer events

---

## 🧪 Testing Steps

### Step 1: Clear Browser Cache
This is **CRITICAL** to ensure new CSS loads:

**Chrome/Edge**:
1. Press `Ctrl + Shift + Del`
2. Select "Cached images and files"
3. Click "Clear data"
4. **Hard Refresh**: `Ctrl + F5`

**Firefox**:
1. Press `Ctrl + Shift + Del`
2. Select "Cache"
3. Click "Clear Now"
4. **Hard Refresh**: `Ctrl + Shift + R`

### Step 2: Reload the Page
1. Navigate to `http://localhost:3000`
2. Login to your account
3. Click "Page Builder" tab
4. Wait for initialization to complete

### Step 3: Check Console Output
Press `F12` and look for these new logs:

```
📦 Importing GrapesJS module...
📦 Importing GrapesJS CSS...
✅ GrapesJS CSS loaded
...
📦 Found X block elements in DOM
✅ Blocks are rendered
🔍 First block styles: {
  pointerEvents: "auto",
  cursor: "grab",
  ...
}
```

**IMPORTANT**: If you see `pointerEvents: "none"`, the CSS hasn't loaded yet. Try:
- Hard refresh again: `Ctrl + F5`
- Clear localStorage: In console, type `localStorage.clear()` then reload

### Step 4: Test Drag & Drop

1. **Find a block** in the left panel (e.g., "Heading" in Basic category)
2. **Hover over it** - cursor should change to ✋ (hand/grab)
3. **Click and HOLD** - cursor should change to ✊ (grabbing)
4. **Drag to canvas** (center area) - you should see a drag preview
5. **Release mouse** - block should appear on canvas

---

## 🔍 Diagnostic Checklist

Run through this checklist and note what you see:

### ✅ Initialization Checks:
- [ ] Console shows "✅ GrapesJS CSS loaded"
- [ ] Console shows "✅ GrapesJS initialized with 39 blocks"
- [ ] Console shows "📦 Found X block elements in DOM" (X > 0)
- [ ] Console shows "✅ Blocks are rendered"

### ✅ Block Visual Checks:
- [ ] Can see blocks in left panel
- [ ] Blocks show icons and labels
- [ ] Blocks have categories (Basic, Layout, etc.)

### ✅ Interaction Checks:
- [ ] Hovering over block changes appearance
- [ ] Cursor changes to hand/grab icon on hover
- [ ] Block has cursor: "grab" in console (check 🔍 output)
- [ ] Block has pointerEvents: "auto" in console

### ✅ Drag Checks:
- [ ] Can click and hold a block
- [ ] Cursor changes to grabbing on click
- [ ] Can move cursor while holding
- [ ] Drag preview appears
- [ ] Can drop on canvas

---

## 🐛 Still Not Working? Run This Debug Script

Copy this into your browser console (F12):

```javascript
// Debug script for drag and drop
console.log('=== DRAG & DROP DIAGNOSTIC ===');

// Check blocks
const blocks = document.querySelectorAll('.gjs-block');
console.log(`Found ${blocks.length} blocks`);

if (blocks.length > 0) {
  const firstBlock = blocks[0];
  const style = window.getComputedStyle(firstBlock);
  
  console.log('First block styles:');
  console.log('  cursor:', style.cursor);
  console.log('  pointer-events:', style.pointerEvents);
  console.log('  user-select:', style.userSelect);
  console.log('  draggable:', firstBlock.draggable);
  
  // Check if block is visible
  const rect = firstBlock.getBoundingClientRect();
  console.log('  position:', rect.top, rect.left);
  console.log('  size:', rect.width, rect.height);
  console.log('  visible:', rect.width > 0 && rect.height > 0);
  
  // Try to trigger drag
  console.log('\n📝 Try dragging the block now...');
  firstBlock.addEventListener('mousedown', () => console.log('✅ Mouse down detected'));
  firstBlock.addEventListener('drag', () => console.log('✅ Drag detected'));
  firstBlock.addEventListener('dragstart', () => console.log('✅ Drag start detected'));
} else {
  console.error('❌ No blocks found! GrapesJS may not have initialized correctly.');
}

// Check canvas
const canvas = document.querySelector('.gjs-cv-canvas');
console.log('\nCanvas:', canvas ? '✅ Found' : '❌ Not found');

// Check frame
const frame = document.querySelector('.gjs-frame');
console.log('Frame:', frame ? '✅ Found' : '❌ Not found');

console.log('\n=== END DIAGNOSTIC ===');
```

**Copy the output and share it if drag-drop still doesn't work.**

---

## 💡 Common Issues & Solutions

### Issue 1: Cursor doesn't change to grab
**Cause**: CSS not loaded or overridden
**Solution**:
1. Hard refresh: `Ctrl + F5`
2. Check console for "✅ GrapesJS CSS loaded"
3. Check block styles in console output

### Issue 2: Can click but can't drag
**Cause**: Pointer events blocked
**Solution**:
1. Run the debug script above
2. Check if `pointerEvents` is "auto"
3. If "none", clear cache and hard refresh

### Issue 3: Blocks not visible
**Cause**: Blocks not rendered
**Solution**:
1. Check console for "⚠️ No block elements found"
2. Check if `#blocks-container` exists in DOM
3. Reload page

### Issue 4: GrapesJS CSS not loading
**Symptoms**: Console shows error loading CSS
**Solution**:
1. Check if `grapesjs/dist/css/grapes.min.css` exists in `node_modules`
2. Run: `cd frontend && npm install grapesjs`
3. Restart dev server

---

## 📊 Expected Console Output

When everything works, you should see:

```
📦 Importing GrapesJS module...
📦 Importing GrapesJS CSS...
✅ GrapesJS CSS loaded
🚀 Starting GrapesJS initialization...
✅ GrapesJS library loaded successfully
📦 Loading GrapesJS configuration...
✅ Configuration loaded
🔍 Checking DOM containers: {blocks: true, traits: true, ...}
✅ All containers found
📋 Initializing with config: {...}
✅ GrapesJS instance created
📦 Block Manager: BlockManager {...}
📦 Block Manager Container: <div id="blocks-container">
📦 Canvas: Canvas {...}
📦 Canvas Frame: <iframe class="gjs-frame">
📦 Found 39 block elements in DOM
✅ Blocks are rendered
🔍 First block styles: {
  pointerEvents: "auto",
  userSelect: "none",
  cursor: "grab",
  draggable: false
}
⚙️ Setting up GrapesJS commands...
✅ GrapesJS initialized with 39 blocks
📦 Available blocks: (39) [...  ]
🎉 GrapesJS initialization complete!
```

---

## 🎬 Video Guide (If Available)

Watch this sequence:
1. Block in panel
2. Hover → cursor changes
3. Click and hold → cursor changes to grabbing
4. Move mouse → drag preview follows
5. Release over canvas → block appears

---

## 🆘 If Still Not Working

**Share this information**:

1. **Console output** (copy everything from F12 console)
2. **Debug script output** (run the script above and copy result)
3. **Screenshot** of the page builder
4. **Browser and version** (e.g., Chrome 120, Firefox 121)
5. **Operating System** (Windows, Mac, Linux)

**Quick Fix to Try**:
```bash
# Stop everything
# Clear everything

# Backend
cd backend
rm -rf __pycache__
rm db.sqlite3
python manage.py migrate
python manage.py runserver

# Frontend (in new terminal)
cd frontend
rm -rf node_modules/.vite
npm install
npm run dev

# Then hard refresh browser: Ctrl + F5
```

---

## ✨ Success!

You'll know drag & drop is working when:
- ✅ Cursor changes to ✋ on hover
- ✅ Cursor changes to ✊ while dragging
- ✅ Drag preview appears
- ✅ Block appears on canvas after drop
- ✅ Can select and edit the dropped block

**Once it works, you can:**
- Drag any block from left panel
- Drop anywhere on canvas
- Move elements around
- Resize elements
- Edit styles in right panel
- Save your project
- Export HTML/CSS

---

**Happy Building! 🚀**

The drag and drop should now work perfectly. If you see the expected console output and blocks render with proper styles, everything is configured correctly!

