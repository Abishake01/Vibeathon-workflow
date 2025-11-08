# GrapesJS Studio SDK Page Builder

A modern, feature-rich no-code page builder powered by GrapesJS Studio SDK.

## Overview

This page builder has been completely rebuilt using the latest **GrapesJS Studio SDK** instead of the legacy GrapesJS library. This provides a significantly improved user experience with modern features, better performance, and a cleaner codebase.

## Features

### 🎨 Modern UI/UX
- Clean, intuitive interface with tabbed panels
- Light and dark theme support
- Responsive design for all screen sizes
- Smooth animations and transitions

### 🧩 Pre-built Components
- **Hero Sections** - Eye-catching landing sections with gradients
- **Feature Grids** - Showcase features in beautiful card layouts
- **Call-to-Action** - Convert visitors with compelling CTAs
- **Pricing Cards** - Professional pricing tables
- **Testimonials** - Display customer reviews with ratings
- **Advanced Components** - Dialogs, tables, navigation, and image galleries

### 📐 Layout System
- Drag-and-drop block system
- Three-panel layout (Blocks, Canvas, Properties)
- Tabbed interface for blocks, layers, styles, and properties
- Visual component tree (Layers panel)
- Advanced style editor with all CSS properties

### 🎯 Global Styles
- Define global colors and typography
- Centralized style management
- Consistent design system across pages

### 📄 Multi-page Support
- Create unlimited pages
- Duplicate existing pages
- Page-specific settings
- Easy navigation between pages

### 💾 Project Management
- Auto-save functionality
- Local storage persistence
- Project export/import
- Template system with pre-built designs

### 🖼️ Asset Management
- Upload images and media
- Asset library
- Easy integration with external URLs
- Support for various file types

### 🔌 Plugin System
- Dialog Component - Interactive modals
- Table Component - Advanced data tables
- Navigation Component - Dynamic page links
- Image Gallery - Lightbox for images

## Architecture

### Technology Stack
- **React** - UI framework
- **GrapesJS Studio SDK** - Page builder core
- **Studio SDK Plugins** - Extended functionality
- **Tailwind CSS** - Styling framework (in canvas)

### File Structure
```
ui-builder/
├── PageBuilder.jsx       # Main component
├── PageBuilder.css       # Styles
├── README.md            # Documentation (this file)
└── SETUP_GUIDE.md       # Setup instructions
```

## Configuration

The page builder is configured through the `StudioEditor` options:

### Theme
```javascript
theme: 'light' | 'dark'
customTheme: {
  colors: {
    global: { /* colors */ },
    primary: { /* colors */ },
    component: { /* colors */ }
  }
}
```

### Project
```javascript
project: {
  type: 'web',
  default: {
    pages: [
      {
        id: 'page-id',
        name: 'Page Name',
        component: '<html>...</html>'
      }
    ]
  }
}
```

### Layout
The layout is fully customizable with panels, tabs, and buttons:
```javascript
layout: {
  default: {
    type: 'row',
    children: [
      { type: 'sidebarLeft' },
      { type: 'canvasSidebarTop' },
      { type: 'sidebarRight' }
    ]
  }
}
```

### Blocks
Custom blocks can be added with full HTML/CSS support:
```javascript
blocks: {
  default: [
    {
      id: 'my-block',
      label: 'My Block',
      category: 'Custom',
      media: '<svg>...</svg>',
      content: '<div>...</div>'
    }
  ]
}
```

### Plugins
```javascript
plugins: [
  dialogComponent.init({ block: { category: 'Advanced' } }),
  tableComponent.init({ block: { category: 'Advanced' } }),
  listPagesComponent.init({ block: { category: 'Advanced' } }),
  fsLightboxComponent.init({ block: { category: 'Advanced' } })
]
```

## Usage

### Basic Implementation
```jsx
import PageBuilder from './components/ui-builder/PageBuilder';

function App() {
  return <PageBuilder />;
}
```

### With Theme Context
```jsx
import { useTheme } from './theme';
import PageBuilder from './components/ui-builder/PageBuilder';

function App() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={theme}>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <PageBuilder />
    </div>
  );
}
```

## API Reference

### Editor Instance
The editor instance is available through the `onReady` callback:

```javascript
editor => {
  // Get project data
  const projectData = editor.getProjectData();
  
  // Save project
  localStorage.setItem('project', JSON.stringify(projectData));
  
  // Listen to changes
  editor.on('update', () => {
    console.log('Project updated');
  });
}
```

### Key Methods
- `editor.getProjectData()` - Get full project JSON
- `editor.Pages.add()` - Add a new page
- `editor.Pages.getAll()` - Get all pages
- `editor.Blocks.add()` - Add custom block
- `editor.on('event', callback)` - Listen to events

## Customization

### Adding Custom Blocks
```javascript
blocks: {
  default: [
    {
      id: 'custom-button',
      label: 'Custom Button',
      category: 'Components',
      media: '<svg>...</svg>',
      content: `
        <button class="px-6 py-3 bg-blue-600 text-white rounded-lg">
          Click Me
        </button>
      `
    }
  ]
}
```

### Global Styles
```javascript
globalStyles: {
  default: [
    {
      id: 'primaryColor',
      property: 'color',
      field: 'color',
      defaultValue: '#3b82f6',
      selector: ':root',
      label: 'Primary Color',
      category: { id: 'colors', label: 'Colors' }
    }
  ]
}
```

### Templates
```javascript
templates: {
  onLoad: async () => [
    {
      id: 'template-1',
      name: 'Landing Page',
      thumbnail: 'https://...',
      data: {
        pages: [/* page data */]
      }
    }
  ]
}
```

## Migration from Legacy GrapesJS

### Key Differences
1. **No Manual Configuration** - Studio SDK handles most setup
2. **Built-in UI** - No need for custom panels and toolbars
3. **Modern API** - Cleaner, more intuitive methods
4. **Better Performance** - Optimized rendering and state management
5. **Plugin System** - Official plugins with guaranteed compatibility

### Benefits
- ✅ Faster development
- ✅ Better UX out of the box
- ✅ Easier maintenance
- ✅ Modern features
- ✅ Active support
- ✅ Regular updates

## Troubleshooting

### Editor Not Loading
- Check that all dependencies are installed
- Verify Studio SDK version compatibility
- Check browser console for errors

### Styles Not Applying
- Ensure Tailwind CDN is loaded in page head
- Check that styles are saved correctly
- Verify selector targeting

### Blocks Not Appearing
- Check block category spelling
- Verify block content is valid HTML
- Check for JavaScript errors

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Tips
1. Use lazy loading for images
2. Minimize custom CSS rules
3. Optimize block content
4. Use production build for deployment
5. Enable caching in production

## Resources
- [GrapesJS Studio SDK Docs](https://grapesjs.com/docs/studio-sdk/)
- [Plugin Documentation](https://grapesjs.com/docs/studio-sdk/plugins/)
- [API Reference](https://grapesjs.com/docs/api/)
- [Community Forum](https://github.com/GrapesJS/grapesjs/discussions)

## License
This project uses GrapesJS Studio SDK. Check their licensing terms for commercial use.

## Support
For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with details
4. Join the community forum

---

**Last Updated:** November 2024
**Version:** 2.0.0 (Studio SDK)
