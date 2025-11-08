// Basic blocks for GrapesJS Page Builder

export const basicBlocks = [
  {
    id: 'text',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7h16M4 12h16M4 17h10"/>
        </svg>
        <span>Text</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'text',
      content: 'Insert your text here',
      style: {
        padding: '10px',
        'font-size': '16px',
        color: '#333'
      }
    }
  },
  {
    id: 'heading',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12h8m0-8v16M16 8V6h4v2m-4 10v2h4v-2m-2-6h-2"/>
        </svg>
        <span>Heading</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'text',
      tagName: 'h1',
      content: 'Heading Text',
      style: {
        padding: '10px',
        'font-size': '32px',
        'font-weight': 'bold',
        color: '#1a202c'
      }
    }
  },
  {
    id: 'paragraph',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M4 9h16"/>
        </svg>
        <span>Paragraph</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'text',
      tagName: 'p',
      content: 'This is a paragraph. Click to edit and add your own text. It\'s easy to customize and style.',
      style: {
        padding: '10px',
        'font-size': '16px',
        'line-height': '1.6',
        color: '#4a5568'
      }
    }
  },
  {
    id: 'image',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <span>Image</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'image',
      style: {
        width: '100%',
        'max-width': '400px',
        height: 'auto',
        display: 'block',
        'object-fit': 'cover'
      },
      attributes: {
        src: 'https://via.placeholder.com/800x600/667eea/ffffff?text=Your+Image',
        alt: 'Placeholder image'
      }
    },
    select: true,
    activate: true
  },
  {
    id: 'button',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="18" height="8" rx="2"/>
        </svg>
        <span>Button</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'link',
      tagName: 'a',
      content: 'Click Me',
      style: {
        display: 'inline-block',
        padding: '12px 32px',
        'background-color': '#667eea',
        color: '#ffffff',
        'text-decoration': 'none',
        'border-radius': '8px',
        'font-weight': '600',
        'font-size': '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        'box-shadow': '0 4px 6px rgba(0,0,0,0.1)'
      },
      attributes: {
        href: '#'
      }
    }
  },
  {
    id: 'link',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span>Link</span>
      </div>
    `,
    category: 'Basic',
    content: {
      type: 'link',
      content: 'Link Text',
      style: {
        color: '#667eea',
        'text-decoration': 'underline',
        cursor: 'pointer'
      },
      attributes: {
        href: '#'
      }
    }
  },
  {
    id: 'divider',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
        </svg>
        <span>Divider</span>
      </div>
    `,
    category: 'Basic',
    content: `
      <hr style="
        border: none;
        border-top: 2px solid #e2e8f0;
        margin: 20px 0;
      " />
    `
  },
  {
    id: 'spacer',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v18M16 3v18"/>
        </svg>
        <span>Spacer</span>
      </div>
    `,
    category: 'Basic',
    content: `
      <div class="spacer" style="
        height: 40px;
        background: transparent;
      "></div>
    `
  },
  {
    id: 'icon',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>Icon</span>
      </div>
    `,
    category: 'Basic',
    content: `
      <div style="font-size: 48px; color: #667eea; text-align: center; padding: 20px;">
        ★
      </div>
    `
  }
];

