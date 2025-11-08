// Tailwind CSS blocks - modern, responsive components

export const simpleBlocks = [
  // TEXT
  {
    id: 'text',
    label: 'Text',
    category: 'Basic',
    content: '<div class="text-base text-gray-700">Edit this text</div>',
    attributes: { class: 'text-block' }
  },
  
  // HEADING
  {
    id: 'heading',
    label: 'Heading',
    category: 'Basic',
    content: '<h1 class="text-4xl font-bold text-gray-900 mb-4">Heading</h1>',
    attributes: { class: 'heading-block' }
  },
  
  // PARAGRAPH
  {
    id: 'paragraph',
    label: 'Paragraph',
    category: 'Basic',
    content: '<p class="text-base text-gray-600 leading-relaxed">This is a paragraph. Click to edit the text.</p>',
    attributes: { class: 'paragraph-block' }
  },
  
  // BUTTON
  {
    id: 'button',
    label: 'Button',
    category: 'Basic',
    content: '<button class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer">Click Me</button>',
    attributes: { class: 'button-block' }
  },
  
  // IMAGE
  {
    id: 'image',
    label: 'Image',
    category: 'Basic',
    content: '<img src="https://via.placeholder.com/350x200" alt="Placeholder Image" class="w-full h-auto rounded-lg shadow-md">',
    attributes: { class: 'image-block' }
  },
  
  // CONTAINER
  {
    id: 'container',
    label: 'Container',
    category: 'Layout',
    content: '<div class="p-5 border-2 border-dashed border-gray-300 rounded-lg min-h-[100px] bg-gray-50">Container - Drop elements here</div>',
    attributes: { class: 'container-block' }
  },
  
  // 2 COLUMNS
  {
    id: 'columns-2',
    label: '2 Columns',
    category: 'Layout',
    content: '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div></div>',
    attributes: { class: 'columns-2-block' }
  },
  
  // 3 COLUMNS
  {
    id: 'columns-3',
    label: '3 Columns',
    category: 'Layout',
    content: '<div class="flex flex-col md:flex-row gap-5"><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 1</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 2</div><div class="flex-1 p-5 border border-gray-300 rounded-lg bg-white">Column 3</div></div>',
    attributes: { class: 'columns-3-block' }
  },
  
  // SECTION
  {
    id: 'section',
    label: 'Section',
    category: 'Layout',
    content: '<section class="py-10 px-5 bg-gray-100 my-5 rounded-lg"><h2 class="text-3xl font-bold text-gray-900 mb-4">Section Title</h2><p class="text-gray-600">Section content goes here.</p></section>',
    attributes: { class: 'section-block' }
  },
  
  // CARD
  {
    id: 'card',
    label: 'Card',
    category: 'Layout',
    content: '<div class="border border-gray-200 rounded-xl p-6 shadow-lg bg-white"><h3 class="text-2xl font-bold text-gray-900 mb-3">Card Title</h3><p class="text-gray-600 mb-4">Card content goes here.</p><button class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 cursor-pointer">Action</button></div>',
    attributes: { class: 'card-block' }
  }
];

export default simpleBlocks;

