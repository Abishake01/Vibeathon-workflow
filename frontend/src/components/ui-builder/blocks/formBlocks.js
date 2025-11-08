// Form blocks for GrapesJS Page Builder

export const formBlocks = [
  {
    id: 'form',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M7 8h10M7 12h10M7 16h6"/>
        </svg>
        <span>Form</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <form style="
        max-width: 600px;
        margin: 20px auto;
        padding: 30px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">
        <h3 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1a202c;">Contact Form</h3>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">Name</label>
          <input type="text" placeholder="Your name" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
          "/>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">Email</label>
          <input type="email" placeholder="your@email.com" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
          "/>
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #4a5568;">Message</label>
          <textarea placeholder="Your message" rows="4" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
          "></textarea>
        </div>
        <button type="submit" style="
          width: 100%;
          padding: 14px;
          background: #667eea;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        ">Send Message</button>
      </form>
    `
  },
  {
    id: 'input',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="10" width="18" height="4" rx="2"/>
        </svg>
        <span>Input</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <input type="text" placeholder="Enter text..." style="
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        transition: all 0.3s;
      "/>
    `
  },
  {
    id: 'textarea',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="6" width="18" height="12" rx="2"/>
          <path d="M7 10h10M7 14h6"/>
        </svg>
        <span>Textarea</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <textarea placeholder="Enter your message..." rows="4" style="
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        font-family: inherit;
        transition: all 0.3s;
      "></textarea>
    `
  },
  {
    id: 'select',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="10" width="18" height="4" rx="2"/>
          <path d="M12 14l-3 3 3 3"/>
        </svg>
        <span>Select</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <select style="
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        background: #ffffff;
        cursor: pointer;
      ">
        <option>Select an option</option>
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </select>
    `
  },
  {
    id: 'checkbox',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <span>Checkbox</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px;">
        <input type="checkbox" style="
          width: 20px;
          height: 20px;
          cursor: pointer;
          accent-color: #667eea;
        "/>
        <span style="font-size: 14px; color: #4a5568;">Checkbox option</span>
      </label>
    `
  },
  {
    id: 'radio',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
        </svg>
        <span>Radio</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px;">
          <input type="radio" name="radio-group" style="
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #667eea;
          "/>
          <span style="font-size: 14px; color: #4a5568;">Option 1</span>
        </label>
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px;">
          <input type="radio" name="radio-group" style="
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #667eea;
          "/>
          <span style="font-size: 14px; color: #4a5568;">Option 2</span>
        </label>
      </div>
    `
  },
  {
    id: 'label',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7h16M4 12h16M4 17h10"/>
        </svg>
        <span>Label</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <label style="
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        font-size: 14px;
        color: #4a5568;
      ">Form Label</label>
    `
  },
  {
    id: 'button-submit',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="18" height="8" rx="2"/>
          <path d="M12 12l4-4-4 4-4-4 4 4z"/>
        </svg>
        <span>Submit Button</span>
      </div>
    `,
    category: 'Forms',
    content: `
      <button type="submit" style="
        padding: 12px 32px;
        background: #667eea;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">Submit</button>
    `
  }
];

