// Layout blocks for GrapesJS Page Builder

export const layoutBlocks = [
  {
    id: 'container',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        <span>Container</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div class="container" style="
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      ">
        <p style="text-align: center; color: #718096;">Container content here</p>
      </div>
    `
  },
  {
    id: 'section',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
        </svg>
        <span>Section</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <section style="
        padding: 60px 20px;
        background-color: #f7fafc;
      ">
        <div style="max-width: 1200px; margin: 0 auto;">
          <h2 style="font-size: 32px; font-weight: bold; margin-bottom: 20px; color: #1a202c;">Section Title</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Section content goes here. Add your text, images, and other elements.</p>
        </div>
      </section>
    `
  },
  {
    id: 'columns-2',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="18"/>
          <rect x="14" y="3" width="7" height="18"/>
        </svg>
        <span>2 Columns</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 20px;
      ">
        <div style="
          padding: 30px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #1a202c;">Column 1</h3>
          <p style="color: #718096;">Content for first column</p>
        </div>
        <div style="
          padding: 30px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #1a202c;">Column 2</h3>
          <p style="color: #718096;">Content for second column</p>
        </div>
      </div>
    `
  },
  {
    id: 'columns-3',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="5" height="18"/>
          <rect x="9" y="3" width="5" height="18"/>
          <rect x="16" y="3" width="5" height="18"/>
        </svg>
        <span>3 Columns</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        padding: 20px;
      ">
        <div style="
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        ">
          <h4 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1a202c;">Column 1</h4>
          <p style="color: #718096; font-size: 14px;">Content</p>
        </div>
        <div style="
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        ">
          <h4 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1a202c;">Column 2</h4>
          <p style="color: #718096; font-size: 14px;">Content</p>
        </div>
        <div style="
          padding: 20px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          text-align: center;
        ">
          <h4 style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #1a202c;">Column 3</h4>
          <p style="color: #718096; font-size: 14px;">Content</p>
        </div>
      </div>
    `
  },
  {
    id: 'columns-4',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="3" height="18"/>
          <rect x="7" y="3" width="3" height="18"/>
          <rect x="12" y="3" width="3" height="18"/>
          <rect x="17" y="3" width="3" height="18"/>
        </svg>
        <span>4 Columns</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        padding: 20px;
      ">
        ${Array(4).fill(0).map((_, i) => `
          <div style="
            padding: 15px;
            background: #ffffff;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
          ">
            <p style="color: #718096; font-size: 14px;">Column ${i + 1}</p>
          </div>
        `).join('')}
      </div>
    `
  },
  {
    id: 'flex-row',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="7" height="8"/>
          <rect x="14" y="8" width="7" height="8"/>
        </svg>
        <span>Flex Row</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        display: flex;
        flex-direction: row;
        gap: 20px;
        padding: 20px;
        flex-wrap: wrap;
      ">
        <div style="
          flex: 1;
          min-width: 200px;
          padding: 20px;
          background: #edf2f7;
          border-radius: 8px;
        ">Flex item 1</div>
        <div style="
          flex: 1;
          min-width: 200px;
          padding: 20px;
          background: #edf2f7;
          border-radius: 8px;
        ">Flex item 2</div>
      </div>
    `
  },
  {
    id: 'flex-column',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="8" y="3" width="8" height="7"/>
          <rect x="8" y="14" width="8" height="7"/>
        </svg>
        <span>Flex Column</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 20px;
      ">
        <div style="
          padding: 20px;
          background: #edf2f7;
          border-radius: 8px;
        ">Flex item 1</div>
        <div style="
          padding: 20px;
          background: #edf2f7;
          border-radius: 8px;
        ">Flex item 2</div>
      </div>
    `
  },
  {
    id: 'card',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <path d="M4 10h16"/>
        </svg>
        <span>Card</span>
      </div>
    `,
    category: 'Layout',
    content: `
      <div style="
        max-width: 400px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        overflow: hidden;
        margin: 20px;
      ">
        <img src="https://via.placeholder.com/400x200/667eea/ffffff?text=Card+Image" 
             alt="Card" 
             style="width: 100%; height: 200px; object-fit: cover;"/>
        <div style="padding: 24px;">
          <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #1a202c;">Card Title</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #718096; margin-bottom: 16px;">
            Card description goes here. Add your content and customize as needed.
          </p>
          <a href="#" style="
            display: inline-block;
            padding: 10px 20px;
            background: #667eea;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
          ">Learn More</a>
        </div>
      </div>
    `
  }
];

