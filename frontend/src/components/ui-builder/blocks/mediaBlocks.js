// Media blocks for GrapesJS Page Builder

export const mediaBlocks = [
  {
    id: 'video',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <polygon points="10 9 15 12 10 15" fill="currentColor"/>
        </svg>
        <span>Video</span>
      </div>
    `,
    category: 'Media',
    content: `
      <div style="
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        max-width: 100%;
        background: #000;
        border-radius: 8px;
      ">
        <iframe 
          src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          "
        ></iframe>
      </div>
    `
  },
  {
    id: 'video-html5',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M10 9l5 3-5 3z" fill="currentColor"/>
        </svg>
        <span>HTML5 Video</span>
      </div>
    `,
    category: 'Media',
    content: `
      <video controls style="
        width: 100%;
        max-width: 800px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">
        <source src="your-video.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `
  },
  {
    id: 'image-gallery',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span>Image Gallery</span>
      </div>
    `,
    category: 'Media',
    content: `
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        padding: 20px;
      ">
        ${Array(4).fill(0).map((_, i) => `
          <div style="
            position: relative;
            overflow: hidden;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s;
          ">
            <img 
              src="https://via.placeholder.com/400x300/667eea/ffffff?text=Image+${i + 1}" 
              alt="Gallery image ${i + 1}"
              style="
                width: 100%;
                height: 250px;
                object-fit: cover;
                display: block;
              "
            />
          </div>
        `).join('')}
      </div>
    `
  },
  {
    id: 'audio',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18V6l12-3v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <span>Audio</span>
      </div>
    `,
    category: 'Media',
    content: `
      <audio controls style="
        width: 100%;
        max-width: 600px;
        border-radius: 8px;
      ">
        <source src="your-audio.mp3" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
    `
  },
  {
    id: 'icon-box',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
        <span>Icon Box</span>
      </div>
    `,
    category: 'Media',
    content: `
      <div style="
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 30px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 500px;
      ">
        <div style="
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #ffffff;
          flex-shrink: 0;
        ">★</div>
        <div>
          <h4 style="font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a202c;">Feature Title</h4>
          <p style="font-size: 14px; color: #718096; line-height: 1.6;">Description of the feature goes here.</p>
        </div>
      </div>
    `
  },
  {
    id: 'map',
    label: `
      <div class="gjs-block-label">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/>
        </svg>
        <span>Map</span>
      </div>
    `,
    category: 'Media',
    content: `
      <div style="
        width: 100%;
        height: 400px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      ">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2412648750455!2d-73.98784368459395!3d40.74844097932847!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469%3A0xd134e199a405a163!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus" 
          width="100%" 
          height="100%" 
          style="border:0;" 
          allowfullscreen="" 
          loading="lazy"
        ></iframe>
      </div>
    `
  }
];

