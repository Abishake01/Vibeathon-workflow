// Page Builder API for backend communication

const API_BASE_URL = '/api/page-builder';

export const pageBuilderApi = {
  // Save page to backend
  async savePage(pageData) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save page: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving page:', error);
      throw error;
    }
  },

  // Update existing page
  async updatePage(pageId, pageData) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${pageId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating page:', error);
      throw error;
    }
  },

  // Load page from backend
  async loadPage(pageId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${pageId}/`);

      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading page:', error);
      throw error;
    }
  },

  // Get all pages
  async getAllPages() {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/`);

      if (!response.ok) {
        throw new Error(`Failed to get pages: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting pages:', error);
      throw error;
    }
  },

  // Delete page
  async deletePage(pageId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${pageId}/`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete page: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  },

  // Publish page
  async publishPage(pageId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${pageId}/publish/`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to publish page: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error publishing page:', error);
      throw error;
    }
  },

  // Get published page URL
  getPublishedPageUrl(pageId) {
    return `${window.location.origin}/pages/${pageId}`;
  },

  // Local storage operations (fallback when backend is not available)
  localStorage: {
    savePage(pageData) {
      const pageId = pageData.id || `page_${Date.now()}`;
      const pages = this.getAllPages();
      const existingIndex = pages.findIndex(p => p.id === pageId);

      if (existingIndex >= 0) {
        pages[existingIndex] = { ...pageData, id: pageId, updatedAt: new Date().toISOString() };
      } else {
        pages.push({ ...pageData, id: pageId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      localStorage.setItem('pageBuilderPages', JSON.stringify(pages));
      return { ...pageData, id: pageId };
    },

    loadPage(pageId) {
      const pages = this.getAllPages();
      return pages.find(p => p.id === pageId);
    },

    getAllPages() {
      try {
        const pagesJson = localStorage.getItem('pageBuilderPages');
        return pagesJson ? JSON.parse(pagesJson) : [];
      } catch (error) {
        console.error('Error loading pages from localStorage:', error);
        return [];
      }
    },

    deletePage(pageId) {
      const pages = this.getAllPages();
      const filteredPages = pages.filter(p => p.id !== pageId);
      localStorage.setItem('pageBuilderPages', JSON.stringify(filteredPages));
      return true;
    }
  }
};

export default pageBuilderApi;

