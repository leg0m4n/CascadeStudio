// Fixed version of MetalCastingService.js - async errors corrected

class MetalCastingService {
    constructor() {
      this.baseUrl = 'https://aestus.industries/api';
      this.cache = new Map();
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
  
    // Test connection to API
    async testConnection() {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        const result = await response.json();
        console.log('API Connection:', result);
        return result.status === 'healthy';
      } catch (error) {
        console.error('Failed to connect to API:', error);
        return false;
      }
    }
  
    // Get project by ID - Updated to use cascade endpoint
    async getProjectById(projectId) {
      try {
        console.log('Fetching project by ID:', projectId);
        const response = await fetch(`${this.baseUrl}/cascade/projects/${projectId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const project = await response.json();
        console.log('Project fetched:', project);
        return project;
      } catch (error) {
        console.error('Error fetching project by ID:', error);
        throw error;
      }
    }
  
    // Download STEP file by file ID
    async downloadStepFileById(fileId) {
      try {
        console.log('Downloading STEP file by ID:', fileId);
        const response = await fetch(`${this.baseUrl}/cascade/files/${fileId}/download`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const stepContent = await response.text();
        console.log('STEP file downloaded, size:', stepContent.length);
        return stepContent;
      } catch (error) {
        console.error('Error downloading STEP file:', error);
        throw error;
      }
    }
  
    // Simplified version - just load the file and show one line
    async initializeCascadeStudioWithProject(projectId) {
      try {
        console.log('🏭 Initializing Cascade Studio with project:', projectId);
        
        // Get project details
        const project = await this.getProjectById(projectId);
        
        if (!project.file) {
          throw new Error('Project has no associated file');
        }
        
        // Download the STEP file content
        const stepContent = await this.downloadStepFileById(project.file.id);
        
        // Load it into Cascade Studio's file system first
        await this.loadStepFileIntoCAD(stepContent, project.file.originalName);
        
        return { success: true, project };
        
      } catch (error) {
        console.error('Error initializing Cascade Studio with project:', error);
        throw error;
      }
    }

    // Load STEP file into Cascade Studio's file system
    async loadStepFileIntoCAD(stepContent, fileName) {
      try {
        console.log('Loading STEP file into CAD:', fileName);
        
        // Create a File object and simulate the file input process
        return this.simulateFileUpload(stepContent, fileName);
      } catch (error) {
        console.error('Error loading STEP file into CAD:', error);
        throw error;
      }
    }

    // Simulate file upload using Cascade Studio's existing mechanism
    simulateFileUpload(stepContent, fileName) {
      const self = this; // Store reference to this
      
      return new Promise((resolve, reject) => {
        try {
          // Create a blob from the STEP content
          const blob = new Blob([stepContent], { type: 'application/step' });
          const file = new File([blob], fileName, { type: 'application/step' });

          console.log('Created file object:', fileName, 'Size:', file.size);

          // Find the existing file input
          const existingInput = document.getElementById('files');
          if (existingInput) {
            console.log('Using existing file input');
            
            // Create a FileList with our file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            existingInput.files = dataTransfer.files;

            // Set up a message handler to listen for file loading completion
            const handleWorkerMessage = (event) => {
              console.log('Worker message received:', event.data.type);
              
              if (event.data.type === 'loadFiles') {
                // File loading completed, external shapes are now available
                console.log('File loading completed, external files:', event.data.payload);
                window.cascadeStudioWorker.removeEventListener('message', handleWorkerMessage);
                
                // Wait a moment for everything to settle
                setTimeout(() => {
                  self.setSimpleCode(fileName, event.data.payload);
                  resolve(true);
                }, 500);
              }
            };

            // Listen for worker messages
            window.cascadeStudioWorker.addEventListener('message', handleWorkerMessage);

            // Trigger the file loading
            try {
              console.log('Calling loadFiles...');
              loadFiles('files');
            } catch (error) {
              console.error('Error calling loadFiles:', error);
              window.cascadeStudioWorker.removeEventListener('message', handleWorkerMessage);
              reject(error);
            }

            // Timeout after 15 seconds
            setTimeout(() => {
              window.cascadeStudioWorker.removeEventListener('message', handleWorkerMessage);
              reject(new Error('Timeout loading STEP file'));
            }, 15000);

          } else {
            reject(new Error('Could not find file input element (#files)'));
          }

        } catch (error) {
          console.error('Error in simulateFileUpload:', error);
          reject(error);
        }
      });
    }

    // Set simple one-line code
    setSimpleCode(fileName, externalFiles) {
      try {
        if (window.monacoEditor) {
          let simpleCode;
          
          if (externalFiles && Object.keys(externalFiles).length > 0) {
            // We have external files info from the worker
            const fileNames = Object.keys(externalFiles);
            console.log('External files received:', fileNames);
            
            // Try to find our file or use the first available
            let targetFileName = fileNames.find(name => 
              name === fileName || 
              name.includes(fileName.replace('.step', '')) ||
              name.toLowerCase() === fileName.toLowerCase()
            ) || fileNames[0];

            // Simple one-line code
            simpleCode = `// 🏭 ${fileName} loaded from Metal Casting Shop
sceneShapes.push(externalShapes['${targetFileName}']);`;

          } else {
            // Fallback
            simpleCode = `// 🏭 ${fileName} 
// Check console for available files
console.log('Available files:', Object.keys(externalShapes || {}));`;
          }

          window.monacoEditor.setValue(simpleCode);
          console.log('Simple code set');
          
          // Automatically trigger evaluation
          setTimeout(() => {
            if (typeof window.monacoEditor.evaluateCode === 'function') {
              window.monacoEditor.evaluateCode(true);
            }
          }, 1000);
          
        } else {
          console.warn('Monaco editor not found, cannot update code');
        }
      } catch (error) {
        console.error('Error setting simple code:', error);
      }
    }
  
    // Clear cache
    clearCache() {
      this.cache.clear();
    }
  }
  
  // Global instance
  window.metalCastingService = new MetalCastingService();
  console.log('Metal Casting Service initialized');