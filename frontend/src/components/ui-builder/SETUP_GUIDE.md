# GrapesJS Studio SDK Setup Guide

Complete guide to setting up and configuring the GrapesJS Studio SDK Page Builder.

## Prerequisites

- Node.js 16+ and npm/yarn
- React 18+
- Basic knowledge of React and JSX

## Installation

### Step 1: Install Dependencies

```bash
npm install @grapesjs/studio-sdk @grapesjs/studio-sdk-plugins
```

Or with yarn:
```bash
yarn add @grapesjs/studio-sdk @grapesjs/studio-sdk-plugins
```

### Step 2: Import Required Packages

In your component:
```javascript
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import {
  dialogComponent,
  tableComponent,
  listPagesComponent,
  fsLightboxComponent
} from '@grapesjs/studio-sdk-plugins';
```

### Step 3: Basic Setup

Create a basic page builder component:
```jsx
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

function PageBuilder() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <StudioEditor
        options={{
          project: {
            type: 'web',
            default: {
              pages: [
                {
                  name: 'Home',
                  component: '<h1>Hello World</h1>'
                }
              ]
            }
          }
        }}
      />
    </div>
  );
}

export default PageBuilder;
```

## Configuration

### Complete Configuration Example

```jsx
<StudioEditor
  options={{
    // Theme
    theme: 'light',
    customTheme: {
      default: {
        colors: {
          global: {
            background1: '#f4f4f4',
            background2: '#fdfdfd',
            background3: '#ffffff',
            text: '#181818'
          },
          primary: {
            background1: 'hsl(258 90% 66%)',
            text: '#ffffff'
          }
        }
      }
    },

    // Project
    project: {
      type: 'web',
      default: {
        pages: [
          {
            id: 'home',
            name: 'Home',
            component: '<h1>Home Page</h1>'
          }
        ]
      }
    },

    // Layout
    layout: {
      default: {
        type: 'row',
        style: { height: '100%' },
        children: [
          {
            type: 'sidebarLeft',
            children: {
              type: 'tabs',
              value: 'blocks',
              tabs: [
                {
                  id: 'blocks',
                  label: 'Blocks',
                  children: { type: 'panelBlocks' }
                },
                {
                  id: 'layers',
                  label: 'Layers',
                  children: { type: 'panelLayers' }
                }
              ]
            }
          },
          { type: 'canvasSidebarTop' },
          {
            type: 'sidebarRight',
            children: {
              type: 'tabs',
              value: 'styles',
              tabs: [
                {
                  id: 'styles',
                  label: 'Styles',
                  children: {
                    type: 'column',
                    children: [
                      { type: 'panelSelectors' },
                      { type: 'panelStyles' }
                    ]
                  }
                },
                {
                  id: 'props',
                  label: 'Properties',
                  children: { type: 'panelProperties' }
                }
              ]
            }
          }
        ]
      }
    },

    // Blocks
    blocks: {
      default: [
        {
          id: 'my-block',
          label: 'My Block',
          category: 'Custom',
          content: '<div>My Content</div>'
        }
      ]
    },

    // Global Styles
    globalStyles: {
      default: [
        {
          id: 'primaryColor',
          property: 'color',
          field: 'color',
          defaultValue: '#3b82f6',
          selector: ':root',
          label: 'Primary Color'
        }
      ]
    },

    // Pages
    pages: {
      add: ({ editor, rename }) => {
        const page = editor.Pages.add({
          name: 'New Page',
          component: '<div>New Page</div>'
        }, { select: true });
        rename(page);
      }
    },

    // Assets
    assets: {
      storageType: 'self',
      onUpload: async ({ files }) => {
        return files.map(file => ({
          id: URL.createObjectURL(file),
          src: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type,
          size: file.size
        }));
      }
    },

    // Plugins
    plugins: [
      dialogComponent.init({ block: { category: 'Extra' } }),
      tableComponent.init({ block: { category: 'Extra' } }),
      editor => {
        editor.onReady(() => {
          console.log('Editor ready!');
        });
      }
    ]
  }}
/>
```

## Advanced Features

### 1. Editor Events

```javascript
plugins: [
  editor => {
    editor.onReady(() => {
      console.log('Editor is ready');
    });

    editor.on('update', () => {
      console.log('Project updated');
    });

    editor.on('component:selected', (component) => {
      console.log('Component selected:', component);
    });
  }
]
```

### 2. Auto-Save

```javascript
const [editor, setEditor] = useState(null);

plugins: [
  editorInstance => {
    editorInstance.onReady(() => {
      setEditor(editorInstance);
      
      editorInstance.on('update', () => {
        const projectData = editorInstance.getProjectData();
        localStorage.setItem('project', JSON.stringify(projectData));
      });
    });
  }
]
```

### 3. Custom Toolbar Button

```javascript
layout: {
  default: {
    children: [
      {
        type: 'canvasSidebarTop',
        sidebarTop: {
          leftContainer: {
            buttons: ({ items }) => [
              ...items,
              {
                id: 'save',
                label: 'Save',
                icon: '<svg>...</svg>',
                onClick: ({ editor }) => {
                  const data = editor.getProjectData();
                  localStorage.setItem('project', JSON.stringify(data));
                  alert('Saved!');
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 4. Template System

```javascript
templates: {
  onLoad: async () => {
    // Fetch from API
    const response = await fetch('/api/templates');
    const templates = await response.json();
    
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      data: t.projectData
    }));
  }
}
```

### 5. Custom Blocks with JavaScript

```javascript
blocks: {
  default: [
    {
      id: 'interactive-button',
      label: 'Interactive Button',
      category: 'Components',
      content: {
        type: 'button',
        content: 'Click Me',
        script: function() {
          this.addEventListener('click', function() {
            alert('Button clicked!');
          });
        }
      }
    }
  ]
}
```

## Integration Examples

### With React Router

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PageBuilder from './PageBuilder';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/builder" element={<PageBuilder />} />
        <Route path="/builder/:projectId" element={<PageBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### With Backend API

```jsx
function PageBuilder() {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const projectId = useParams().projectId;

  useEffect(() => {
    // Load project from API
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProjectData(data);
        setLoading(false);
      });
  }, [projectId]);

  if (loading) return <div>Loading...</div>;

  return (
    <StudioEditor
      options={{
        project: projectData,
        plugins: [
          editor => {
            editor.on('update', () => {
              const data = editor.getProjectData();
              // Auto-save to API
              fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
              });
            });
          }
        ]
      }}
    />
  );
}
```

### With Authentication

```jsx
function PageBuilder() {
  const { user } = useAuth();

  return (
    <StudioEditor
      options={{
        identity: {
          id: user.id
        },
        assets: {
          storageType: 'cloud',
          apiKey: process.env.REACT_APP_STORAGE_KEY
        },
        plugins: [
          editor => {
            editor.onReady(() => {
              // Track user activity
              analytics.track('Editor Opened', {
                userId: user.id,
                timestamp: new Date()
              });
            });
          }
        ]
      }}
    />
  );
}
```

## Deployment

### Production Build

1. Build your React app:
```bash
npm run build
```

2. Serve static files:
```bash
npm install -g serve
serve -s build
```

### Environment Variables

Create `.env` file:
```env
REACT_APP_API_URL=https://api.yoursite.com
REACT_APP_STORAGE_KEY=your-storage-key
```

Access in code:
```javascript
const apiUrl = process.env.REACT_APP_API_URL;
```

### Performance Optimization

1. **Code Splitting**
```javascript
const PageBuilder = lazy(() => import('./PageBuilder'));

<Suspense fallback={<Loading />}>
  <PageBuilder />
</Suspense>
```

2. **Asset Optimization**
- Use CDN for images
- Compress assets
- Lazy load images

3. **Caching**
```javascript
// Service worker caching
// In public/service-worker.js
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

## Troubleshooting

### Common Issues

#### 1. Editor Not Rendering
**Problem:** White screen or no editor visible
**Solution:**
- Check container has explicit width/height
- Verify all dependencies are installed
- Check console for errors

```jsx
// ✅ Good
<div style={{ width: '100vw', height: '100vh' }}>
  <StudioEditor options={{...}} />
</div>

// ❌ Bad
<div>
  <StudioEditor options={{...}} />
</div>
```

#### 2. Blocks Not Working
**Problem:** Blocks don't appear in panel
**Solution:**
- Verify block configuration
- Check category name
- Ensure content is valid HTML

#### 3. Styles Not Applying
**Problem:** CSS styles don't show in canvas
**Solution:**
- Include Tailwind CDN in page head
- Check selector syntax
- Verify style manager target

#### 4. Save Not Working
**Problem:** Changes not persisting
**Solution:**
- Implement proper save handler
- Check localStorage limits
- Verify API endpoints

### Debug Mode

Enable debug logging:
```javascript
plugins: [
  editor => {
    editor.on('all', (eventName, ...args) => {
      console.log('Event:', eventName, args);
    });
  }
]
```

## Testing

### Unit Tests
```javascript
import { render, screen } from '@testing-library/react';
import PageBuilder from './PageBuilder';

test('renders page builder', () => {
  render(<PageBuilder />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
```

### E2E Tests (Cypress)
```javascript
describe('Page Builder', () => {
  it('should create new page', () => {
    cy.visit('/builder');
    cy.get('[data-test="add-page"]').click();
    cy.get('[data-test="page-name"]').type('New Page');
    cy.get('[data-test="save"]').click();
  });
});
```

## Best Practices

1. **Always set container dimensions explicitly**
2. **Implement proper error handling**
3. **Use debounced auto-save**
4. **Validate user input**
5. **Test on multiple browsers**
6. **Optimize images and assets**
7. **Use production build for deployment**
8. **Implement proper authentication**
9. **Handle network errors gracefully**
10. **Monitor performance metrics**

## Resources

- [Studio SDK Documentation](https://grapesjs.com/docs/studio-sdk/)
- [API Reference](https://grapesjs.com/docs/api/)
- [Plugin Guide](https://grapesjs.com/docs/plugins/)
- [Community Forum](https://github.com/GrapesJS/grapesjs/discussions)
- [Examples Repository](https://github.com/GrapesJS/grapesjs-examples)

## Need Help?

1. Check the [FAQ](https://grapesjs.com/docs/faq/)
2. Search [GitHub Issues](https://github.com/GrapesJS/grapesjs/issues)
3. Ask on [Community Forum](https://github.com/GrapesJS/grapesjs/discussions)
4. Check [Stack Overflow](https://stackoverflow.com/questions/tagged/grapesjs)

---

**Happy Building! 🚀**
