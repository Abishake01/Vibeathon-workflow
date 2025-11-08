// Advanced blocks for GrapesJS Page Builder

export const advancedBlocks = [
  {
    id: 'navbar',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="4"/>
          <path d="M7 8v12M12 8v12M17 8v12"/>
        </svg>
        <span>Navbar</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <nav style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 40px;
        background: #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <div style="
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        ">Brand</div>
        <div style="
          display: flex;
          gap: 30px;
          align-items: center;
        ">
          <a href="#" style="color: #4a5568; text-decoration: none; font-weight: 500;">Home</a>
          <a href="#" style="color: #4a5568; text-decoration: none; font-weight: 500;">About</a>
          <a href="#" style="color: #4a5568; text-decoration: none; font-weight: 500;">Services</a>
          <a href="#" style="color: #4a5568; text-decoration: none; font-weight: 500;">Contact</a>
          <a href="#" style="
            padding: 10px 20px;
            background: #667eea;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          ">Get Started</a>
        </div>
      </nav>
    `
  },
  {
    id: 'hero',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6M9 13h6"/>
        </svg>
        <span>Hero Section</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <section style="
        min-height: 600px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      ">
        <div style="max-width: 800px;">
          <h1 style="
            font-size: 56px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 24px;
            line-height: 1.2;
          ">Build Amazing Websites</h1>
          <p style="
            font-size: 20px;
            color: rgba(255,255,255,0.9);
            margin-bottom: 32px;
            line-height: 1.6;
          ">Create stunning, professional websites with our easy-to-use page builder. No coding required.</p>
          <div style="
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
          ">
            <a href="#" style="
              padding: 16px 40px;
              background: #ffffff;
              color: #667eea;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 700;
              font-size: 18px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">Get Started</a>
            <a href="#" style="
              padding: 16px 40px;
              background: transparent;
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 700;
              font-size: 18px;
              border: 2px solid #ffffff;
            ">Learn More</a>
          </div>
        </div>
      </section>
    `
  },
  {
    id: 'footer',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="20" width="18" height="4"/>
          <path d="M7 20V8M12 20V8M17 20V8"/>
        </svg>
        <span>Footer</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <footer style="
        background: #1a202c;
        color: #ffffff;
        padding: 60px 40px 30px;
      ">
        <div style="
          max-width: 1200px;
          margin: 0 auto;
        ">
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 40px;
            margin-bottom: 40px;
          ">
            <div>
              <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 16px;">Brand Name</h3>
              <p style="color: #a0aec0; line-height: 1.6;">Building amazing digital experiences for the modern web.</p>
            </div>
            <div>
              <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">Company</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">About</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Careers</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">Support</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Help Center</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Contact</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 style="font-size: 16px; font-weight: bold; margin-bottom: 16px;">Legal</h4>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Privacy</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">Terms</a></li>
                <li style="margin-bottom: 8px;"><a href="#" style="color: #a0aec0; text-decoration: none;">License</a></li>
              </ul>
            </div>
          </div>
          <div style="
            border-top: 1px solid #4a5568;
            padding-top: 24px;
            text-align: center;
            color: #a0aec0;
            font-size: 14px;
          ">
            © 2024 Brand Name. All rights reserved.
          </div>
        </div>
      </footer>
    `
  },
  {
    id: 'cta-section',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="18" height="8" rx="2"/>
          <path d="M12 12h.01"/>
        </svg>
        <span>CTA Section</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <section style="
        padding: 80px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        text-align: center;
      ">
        <div style="max-width: 800px; margin: 0 auto;">
          <h2 style="
            font-size: 42px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 20px;
          ">Ready to Get Started?</h2>
          <p style="
            font-size: 18px;
            color: rgba(255,255,255,0.9);
            margin-bottom: 32px;
            line-height: 1.6;
          ">Join thousands of satisfied customers and transform your business today.</p>
          <a href="#" style="
            display: inline-block;
            padding: 16px 48px;
            background: #ffffff;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
          ">Start Free Trial</a>
        </div>
      </section>
    `
  },
  {
    id: 'testimonial',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Testimonial</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <div style="
        max-width: 700px;
        margin: 40px auto;
        padding: 40px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        text-align: center;
      ">
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 32px;
        ">👤</div>
        <p style="
          font-size: 18px;
          line-height: 1.8;
          color: #4a5568;
          margin-bottom: 24px;
          font-style: italic;
        ">"This product has completely transformed the way we work. Highly recommended!"</p>
        <div style="
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 4px;
        ">John Doe</div>
        <div style="
          color: #718096;
          font-size: 14px;
        ">CEO, Company Name</div>
      </div>
    `
  },
  {
    id: 'pricing-card',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="8" width="18" height="12" rx="2"/>
          <path d="M12 12h.01M8 16h8"/>
        </svg>
        <span>Pricing Card</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <div style="
        max-width: 400px;
        margin: 20px;
        padding: 40px;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        text-align: center;
        border: 2px solid #e2e8f0;
      ">
        <h3 style="
          font-size: 24px;
          font-weight: bold;
          color: #1a202c;
          margin-bottom: 16px;
        ">Pro Plan</h3>
        <div style="
          font-size: 48px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 8px;
        ">$29<span style="font-size: 18px; color: #718096;">/mo</span></div>
        <p style="
          color: #718096;
          margin-bottom: 32px;
        ">Perfect for professionals</p>
        <ul style="
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
          text-align: left;
        ">
          <li style="
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
          ">✓ 10 Projects</li>
          <li style="
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
          ">✓ 100GB Storage</li>
          <li style="
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
          ">✓ Priority Support</li>
          <li style="
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
            color: #4a5568;
          ">✓ Advanced Features</li>
        </ul>
        <a href="#" style="
          display: block;
          padding: 14px;
          background: #667eea;
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 700;
          transition: all 0.3s;
        ">Choose Plan</a>
      </div>
    `
  },
  {
    id: 'feature-grid',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span>Feature Grid</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <section style="
        padding: 80px 20px;
        background: #f7fafc;
      ">
        <div style="max-width: 1200px; margin: 0 auto;">
          <h2 style="
            font-size: 42px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 16px;
            color: #1a202c;
          ">Amazing Features</h2>
          <p style="
            text-align: center;
            font-size: 18px;
            color: #718096;
            margin-bottom: 60px;
          ">Everything you need to succeed</p>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
          ">
            ${Array(3).fill(0).map((_, i) => `
              <div style="
                padding: 32px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                text-align: center;
              ">
                <div style="
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 20px;
                  font-size: 32px;
                ">⭐</div>
                <h3 style="
                  font-size: 22px;
                  font-weight: bold;
                  margin-bottom: 12px;
                  color: #1a202c;
                ">Feature ${i + 1}</h3>
                <p style="
                  color: #718096;
                  line-height: 1.6;
                ">Description of this amazing feature that will help your business grow.</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `
  },
  {
    id: 'accordion',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="4" rx="1"/>
          <rect x="3" y="10" width="18" height="4" rx="1"/>
          <rect x="3" y="16" width="18" height="4" rx="1"/>
        </svg>
        <span>Accordion</span>
      </div>
    `,
    category: 'Advanced',
    content: `
      <div style="
        max-width: 800px;
        margin: 40px auto;
      ">
        ${Array(3).fill(0).map((_, i) => `
          <details style="
            background: #ffffff;
            margin-bottom: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
          ">
            <summary style="
              padding: 20px;
              font-weight: 600;
              font-size: 16px;
              color: #1a202c;
              cursor: pointer;
              user-select: none;
            ">Accordion Item ${i + 1}</summary>
            <div style="
              padding: 0 20px 20px;
              color: #718096;
              line-height: 1.6;
            ">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
          </details>
        `).join('')}
      </div>
    `
  }
];

