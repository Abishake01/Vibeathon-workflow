# GrapesJS Page Builder Integration

A modern, feature-rich page builder integrated into the workflow builder application using GrapesJS.

## Features

### Core Functionality
- ✅ **Drag & Drop Interface** - Intuitive drag-and-drop for building pages
- ✅ **Responsive Design Preview** - Test designs on Desktop, Tablet, and Mobile
- ✅ **Modern UI** - Glass-morphism design with dark/light theme support
- ✅ **Code Export** - Export HTML, CSS, and JavaScript with syntax highlighting
- ✅ **Widget Import** - Import external HTML/CSS/JS as custom widgets
- ✅ **Project Management** - Save, load, and manage multiple page projects
- ✅ **Auto-save** - Automatic project saving to localStorage
- ✅ **Workflow Integration** - Trigger workflows from page events

### Block Categories

#### Basic Blocks
- Text
- Heading
- Paragraph
- Image
- Button
- Link
- Divider
- Spacer
- Icon

#### Layout Blocks
- Container
- Section
- 2/3/4 Column Grids
- Flex Row/Column
- Card

#### Form Blocks
- Complete Form
- Input
- Textarea
- Select
- Checkbox
- Radio
- Label
- Submit Button

#### Media Blocks
- Video (YouTube/Vimeo)
- HTML5 Video
- Image Gallery
- Audio
- Icon Box
- Map

#### Advanced Blocks
- Navbar
- Hero Section
- Footer
- CTA Section
- Testimonial
- Pricing Card
- Feature Grid
- Accordion

## Architecture

### File Structure
```
frontend/src/components/ui-builder/
├── PageBuilder.jsx              # Main page builder component
├── PageBuilder.css              # Main styles
├── PageBuilderToolbar.jsx       # Top toolbar with actions
├── PageBuilderToolbar.css       # Toolbar styles
├── grapesConfig.js              # GrapesJS configuration
├── WidgetImportModal.jsx        # Import external widgets
├── WidgetImportModal.css        # Import modal styles
├── CodeExportModal.jsx          # Export code with syntax highlighting
├── CodeExportModal.css          # Export modal styles
├── ProjectManager.jsx           # Manage multiple projects
├── ProjectManager.css           # Project manager styles
└── blocks/
    ├── index.js                 # Block exports
    ├── basicBlocks.js           # Basic UI blocks
    ├── layoutBlocks.js          # Layout components
    ├── formBlocks.js            # Form elements
    ├── mediaBlocks.js           # Media components
    └── advancedBlocks.js        # Advanced components
```

### Key Components

#### PageBuilder.jsx
Main component that initializes and manages GrapesJS editor.
- Handles GrapesJS initialization
- Manages editor state
- Coordinates toolbar actions
- Handles save/load operations

#### PageBuilderToolbar.jsx
Modern toolbar with:
- Project name editing
- Device switcher (Desktop/Tablet/Mobile)
- Undo/Redo actions
- Preview mode
- Export/Import functionality
- Project management

#### Modals
- **WidgetImportModal**: Import external HTML/CSS/JS as custom blocks
- **CodeExportModal**: Export code with syntax highlighting (HTML, CSS, JS)
- **ProjectManager**: Save, load, and manage multiple page projects

## Usage

### Basic Usage

1. **Navigate to Page Builder**
   - Click on "Page Builder" tab in the top navigation

2. **Add Elements**
   - Browse blocks in the left panel
   - Drag blocks onto the canvas
   - Customize using the style panel

3. **Responsive Design**
   - Use device switcher to preview different screen sizes
   - Adjust styles for each breakpoint

4. **Save Project**
   - Click "Save" button in toolbar
   - Projects auto-save every change
   - Access saved projects via "Projects" button

5. **Export Code**
   - Click "Export" button
   - Choose export type (HTML only, HTML+CSS, Full package)
   - Copy code or download files

### Advanced Features

#### Custom Widget Import

```javascript
// Example: Import custom widget
1. Click "Import" button
2. Upload HTML/CSS/JS files or paste code
3. Widget appears in "Custom" category
4. Drag onto canvas like any other block
```

#### Workflow Integration

```javascript
// Page Event Trigger Node
- Triggers workflows from page events
- Supports: button clicks, form submissions, page load
- Extract form data automatically

// Render UI Component Node
- Display page builder components in workflows
- Multiple render modes: inline, modal, fullscreen
- Dynamic component rendering
```

#### Project Management

```javascript
// Save multiple projects
1. Click "Projects" button
2. View all saved projects
3. Load, export, or delete projects
4. Import projects from JSON files
```

## API Integration

### pageBuilderApi.js

Provides backend communication for:
- Save/update pages
- Load pages
- Delete pages
- Publish pages
- Get published URLs

Includes localStorage fallback when backend is unavailable.

```javascript
import { pageBuilderApi } from './api/pageBuilderApi';

// Save page
await pageBuilderApi.savePage(pageData);

// Load page
const page = await pageBuilderApi.loadPage(pageId);

// Publish page
const published = await pageBuilderApi.publishPage(pageId);
```

## Workflow Integration Nodes

### Page Event Trigger
**Location**: Triggers category

Trigger workflows from page builder events:
- Button clicks
- Form submissions
- Page load
- Element clicks
- Custom events

**Properties**:
- Event Type
- Element ID
- Custom Event Name
- Debounce delay
- Extract form data

### Render UI Component
**Location**: UI category

Display page builder components:
- Inline rendering
- Modal display
- Fullscreen mode

**Properties**:
- Component ID
- Render Mode
- Width/Height

## Theme Support

The page builder fully supports light and dark themes:
- Automatic theme detection
- Smooth theme transitions
- Custom GrapesJS styling for each theme
- Panel and toolbar theme integration

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save project
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Y` - Redo
- `Ctrl/Cmd + P` - Preview mode
- `Escape` - Close modals

## Storage

### LocalStorage Keys
- `gjsProject` - Current project
- `gjsProject_{name}` - Named projects
- `pageBuilderPages` - All saved pages

### Data Structure
```json
{
  "projectName": "My Project",
  "html": "<div>...</div>",
  "css": "...",
  "components": [...],
  "styles": [...],
  "savedAt": "2024-01-01T00:00:00.000Z"
}
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Lazy loading of blocks
- Optimized rendering
- Efficient state management
- Auto-save throttling
- Responsive canvas updates

## Customization

### Adding Custom Blocks

```javascript
// In blocks/customBlocks.js
export const customBlocks = [
  {
    id: 'my-block',
    label: 'My Custom Block',
    category: 'Custom',
    content: '<div class="my-block">Content</div>'
  }
];

// Add to allBlocks in blocks/index.js
```

### Custom Styling

```css
/* In PageBuilder.css */
.my-custom-style {
  /* Your styles */
}
```

### Theme Customization

```javascript
// In grapesConfig.js
// Modify color schemes, fonts, etc.
```

## Troubleshooting

### Common Issues

1. **Blocks not appearing**
   - Check browser console for errors
   - Verify block definitions in blocks/
   - Ensure GrapesJS is properly initialized

2. **Save not working**
   - Check localStorage quota
   - Clear old projects if needed
   - Verify browser permissions

3. **Theme not applying**
   - Check data-theme attribute
   - Verify CSS is loaded
   - Check theme provider

4. **Export issues**
   - Verify Prism.js is loaded
   - Check code generation
   - Test with different export types

## Future Enhancements

- [ ] Template library with pre-built pages
- [ ] Component library for reusable elements
- [ ] Version control for projects
- [ ] Collaboration features
- [ ] Asset management
- [ ] SEO optimization tools
- [ ] Performance monitoring
- [ ] A/B testing integration

## Credits

Built with:
- [GrapesJS](https://grapesjs.com/) - Web Builder Framework
- [React](https://react.dev/) - UI Library
- [Prism.js](https://prismjs.com/) - Syntax Highlighting
- [React Icons](https://react-icons.github.io/react-icons/) - Icons

## License

Same as parent project

