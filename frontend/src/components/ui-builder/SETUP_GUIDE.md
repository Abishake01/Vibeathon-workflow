# UI Builder - Setup & Usage Guide

## 🚀 Quick Start

The UI Builder is a drag-and-drop page builder integrated into your workflow application. It allows authenticated users to create responsive web pages visually.

## ✅ Prerequisites

1. **GrapesJS Installation** (Already done ✓)
   ```bash
   npm install grapesjs grapesjs/dist/css/grapes.min.css
   ```

2. **User Authentication** (Required)
   - Users must be logged in to access the page builder
   - Each user has their own isolated workspace
   - Projects are saved per user

## 🎯 How to Access

### From Workflow Builder
1. Login to your account
2. Click on "Page Builder" tab in the toolbar (top of the screen)
3. The UI Builder will load with drag-and-drop components

### Direct Navigation
- The router automatically switches between Workflow Builder and Page Builder
- Your active tab is saved in localStorage

## 🎨 Using the Page Builder

### 1. **Blocks Panel (Left)**
   - **Basic Blocks**: Text, headings, images, buttons, links
   - **Layout Blocks**: Containers, sections, columns, grids
   - **Form Blocks**: Inputs, textareas, forms, buttons
   - **Media Blocks**: Videos, images, galleries, audio
   - **Advanced Blocks**: Navbars, heroes, footers, CTAs

### 2. **Canvas (Center)**
   - Drag blocks from the left panel to the canvas
   - Click elements to select them
   - Drag to reposition elements
   - Use device switcher (Desktop/Tablet/Mobile) to preview responsiveness

### 3. **Properties Panel (Right)**
   - **Component Tab**: Edit element properties (ID, classes, attributes)
   - **Styles Tab**: Edit CSS styles visually (colors, fonts, spacing, etc.)

## 📝 Creating Your First Page

### Step-by-Step:

1. **Add a Container**
   - Drag "Container" block from Layout category
   - This creates a responsive wrapper

2. **Add Content**
   - Drag "Heading" from Basic blocks
   - Drag "Paragraph" for text content
   - Drag "Button" for call-to-action

3. **Style Elements**
   - Click any element to select it
   - Use the Properties panel to change colors, fonts, spacing
   - Preview on different devices using the toolbar buttons

4. **Save Your Work**
   - Click "Save" in the toolbar
   - Projects auto-save every few seconds
   - Name your project in the input field

## 💾 Project Management

### Saving Projects
- **Auto-save**: Enabled by default (saves to localStorage)
- **Manual Save**: Click "Save" button in toolbar
- **Project Name**: Click the project name to rename

### Loading Projects
1. Click "Projects" button in toolbar
2. Browse your saved projects
3. Click a project to load it
4. Search and sort by date/name

### Exporting Code
1. Click "Export" button
2. Choose export type:
   - **HTML Only**: Just the HTML content
   - **HTML + CSS**: HTML with embedded styles
   - **Full Package**: HTML, CSS, and JavaScript
3. Copy or download the code

## 🎨 Importing Widgets

### Import Custom HTML/CSS/JS Components:

1. Click "Import" button in toolbar
2. **Drag and Drop** files or click to browse:
   - HTML files (.html, .htm)
   - CSS files (.css)
   - JavaScript files (.js)

3. **Upload Images**:
   - Click "Upload Images" button
   - Select image files
   - Images are uploaded to server with custom names
   - Image URLs are automatically replaced in HTML

4. **Add External Resources**:
   - Add external scripts (CDN URLs)
   - Add external stylesheets
   - Automatic Tailwind CSS detection

5. **Import Widget**:
   - Widget is added to "Custom" block category
   - Drag from blocks panel to canvas

## 🖼️ Image Management

### Uploading Images:
1. Open Widget Import modal (Import button)
2. Click "Upload Images"
3. Select images from your computer
4. Enter custom names (optional)
5. Images are stored per user on the server

### Using Images:
- Images get unique URLs on the server
- Reference them in HTML: `<img src="[IMAGE:filename.jpg]">`
- Or use direct URLs from the upload response

## 📱 Responsive Design

### Device Preview:
- **Desktop** (default): Full width
- **Tablet**: 768px width
- **Mobile**: 375px width

### Making Elements Responsive:
1. Select an element
2. Switch to Tablet/Mobile view
3. Adjust styles for that device
4. GrapesJS applies media queries automatically

## 🎭 Theme Support

- **Light Mode**: Clean, bright interface
- **Dark Mode**: Easy on the eyes
- Toggle with sun/moon icon in toolbar
- Your preference is saved

## 🔐 User Isolation

### How It Works:
- Each user has a unique workspace
- Projects are saved per user (in localStorage and server)
- Uploaded images are stored in user-specific folders:
  - `ui_assets/user_{user_id}/`
- Guest users (unauthenticated) use `ui_assets/user_guest/`

### Security:
- Asset uploads validate file types (images only)
- File names are sanitized automatically
- User cannot access other users' assets

## 🛠️ Troubleshooting

### Blocks Not Appearing?
1. Open browser console (F12)
2. Look for errors like:
   - `❌ No blocks found!`
   - `❌ GrapesJS containers not found`
3. Check that all block files exist in `blocks/` folder
4. Refresh the page (Ctrl+R or Cmd+R)

### Drag-and-Drop Not Working?
1. Check console for errors
2. Ensure GrapesJS is loaded: Look for `✅ GrapesJS initialized`
3. Make sure you're clicking and holding on blocks
4. Try refreshing the page

### Images Not Uploading?
1. Check file size (< 10MB recommended)
2. Verify file type (jpg, png, gif, svg, webp)
3. Check console for server errors
4. Ensure backend is running

### Can't Save Projects?
1. Check if you're logged in
2. Try manual save (click Save button)
3. Check browser console for errors
4. Clear localStorage if corrupted: `localStorage.clear()`

## 📊 Performance Tips

### For Large Projects:
1. Use "Save" button periodically (don't rely only on auto-save)
2. Export projects as JSON backups
3. Optimize images before uploading
4. Remove unused custom widgets

### Best Practices:
- Use containers for layout structure
- Keep nesting depth reasonable (< 10 levels)
- Test on all device sizes before exporting
- Name elements clearly for easier editing

## 🚦 Backend Setup

### Required Django Settings:

```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Allow larger file uploads
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
```

### URL Configuration:

```python
# workflows/urls.py
from .asset_views import upload_asset, list_assets, delete_asset

urlpatterns = [
    # ... other URLs
    path('ui-assets/upload/', upload_asset, name='upload-asset'),
    path('ui-assets/', list_assets, name='list-assets'),
    path('ui-assets/<str:filename>/', delete_asset, name='delete-asset'),
]
```

## 🎓 Video Tutorials

### Coming Soon:
- [ ] Drag and drop basics
- [ ] Building a landing page
- [ ] Creating responsive layouts
- [ ] Importing custom widgets
- [ ] Exporting and deploying

## 📞 Support

If you encounter issues:
1. Check the console (F12) for error messages
2. Review this guide's troubleshooting section
3. Check that all dependencies are installed
4. Ensure backend is running and accessible

## 🎉 What's Next?

### Advanced Features:
- Custom component creation
- JavaScript interactions
- API integrations
- Dynamic content from workflows
- Real-time collaboration (planned)

Happy building! 🚀

