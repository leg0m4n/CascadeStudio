// js/MetalCastingIntegration.js - Comprehensive Metal Casting Design Suite

class MetalCastingUI {
    constructor() {
      this.service = window.metalCastingService;
      this.isLoading = false;
      this.metalCastingPane = null;
      this.currentProject = null;
      this.isInitialized = false;
      this.guiInstanceId = null;
      
      // Design tool panels
      this.designPanels = {};
      
      // Check for URL parameters first
      this.checkForProjectId();
      
      // Hook into Cascade Studio's GUI lifecycle instead of polling
      this.hookIntoGUILifecycle();
    }
    
    hookIntoGUILifecycle() {
      // Override the evaluateCode function to add our GUI after each recreation
      if (window.monacoEditor && window.monacoEditor.evaluateCode) {
        const originalEvaluateCode = window.monacoEditor.evaluateCode;
        
        window.monacoEditor.evaluateCode = (saveToURL = false) => {
          // Call the original function
          const result = originalEvaluateCode.call(window.monacoEditor, saveToURL);
          
          // After GUI is recreated, add our panel
          setTimeout(() => {
            this.addMetalCastingGUIIfNeeded();
          }, 100);
          
          return result;
        };
        
        console.log('Hooked into Cascade Studio GUI lifecycle');
      } else {
        // Fallback: wait for Monaco Editor to be ready
        setTimeout(() => this.hookIntoGUILifecycle(), 1000);
      }
      
      // Initial setup
      setTimeout(() => this.init(), 1500);
    }
    
    checkForProjectId() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('projectId');
      
      if (projectId) {
        console.log('Cascade Studio launched with project ID:', projectId);
        this.initializeWithProject(projectId);
      }
    }
    
    async initializeWithProject(projectId) {
      try {
        await this.waitForService();
        const result = await window.metalCastingService.initializeCascadeStudioWithProject(projectId);
        console.log('✅ Cascade Studio initialized with Metal Casting project:', result.project.name);
        document.title = `Cascade Studio - ${result.project.name}`;
        
        if (window.realConsoleLog) {
          window.realConsoleLog(`Loaded Metal Casting project: ${result.project.name}`);
        }
        
        this.isInitialized = true;
      } catch (error) {
        console.error('❌ Failed to initialize with Metal Casting project:', error);
      }
    }
    
    waitForService() {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkService = () => {
          if (window.metalCastingService && typeof window.metalCastingService.initializeCascadeStudioWithProject === 'function') {
            resolve();
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkService, 500);
          } else {
            reject(new Error('Metal Casting Service not available after 15 seconds'));
          }
        };
        
        checkService();
      });
    }
  
    async init() {
      if (!this.service) {
        console.warn('Metal Casting Service not available');
        return;
      }
      
      try {
        const connected = await this.service.testConnection();
        if (!connected) {
          console.warn('Metal Casting API not available');
          return;
        }
      } catch (error) {
        console.warn('Metal Casting API connection test failed:', error);
        return;
      }
  
      this.addMetalCastingGUIIfNeeded();
    }
    
    addMetalCastingGUIIfNeeded() {
      // Check if window.gui exists
      if (!window.gui) {
        return;
      }
      
      // Generate a unique ID for this GUI instance
      const currentGuiId = this.generateGUIInstanceId();
      
      // If this is the same GUI instance we already added to, skip
      if (this.guiInstanceId === currentGuiId) {
        return;
      }
      
      // Check if our Metal Casting folder already exists in the current GUI instance
      if (this.metalCastingExists()) {
        this.guiInstanceId = currentGuiId;
        return;
      }
      
      // Add it
      console.log('Adding Aestus Toolkit to Cascade Control Panel...');
      this.setupMetalCastingGUI();
      this.guiInstanceId = currentGuiId;
    }
    
    generateGUIInstanceId() {
      if (!window.gui) return null;
      
      const childCount = window.gui.children ? window.gui.children.length : 0;
      const timestamp = Date.now();
      return `${childCount}-${timestamp}`;
    }
    
    metalCastingExists() {
      if (!window.gui || !window.gui.children) {
        return false;
      }
      
      for (const child of window.gui.children) {
        if (child.controller && 
            child.controller.view && 
            child.controller.view.titleElement) {
          const title = child.controller.view.titleElement.textContent || '';
          if (title.includes('Aestus Toolkit')) {
            this.metalCastingPane = child;
            return true;
          }
        }
      }
      
      return false;
    }
  
    setupMetalCastingGUI() {
      if (!window.gui) {
        return;
      }
      
      try {
        // Add a separator
        window.gui.addSeparator();
  
        // Create main Aestus Toolkit folder
        this.metalCastingPane = window.gui.addFolder({
          title: 'Aestus Toolkit',
          expanded: true
        });

        // Setup design tools directly in main folder
        this.setupDesignTools();
        
        console.log('✅ Aestus Toolkit successfully added!');
        
      } catch (error) {
        console.error('Error setting up Metal Casting GUI:', error);
      }
    }

    setupProjectManagement() {
      // Project management subfolder
      const projectFolder = this.metalCastingPane.addFolder({
        title: '📁 Project Management',
        expanded: false
      });

      // Quick load random project button
      projectFolder.addButton({
        title: '🎲 Load Random Model'
      }).on('click', () => this.loadRandomProject());

      // Project selection dropdown
      this.projectDropdown = projectFolder.addInput(
        { selectedProject: '' }, 
        'selectedProject',
        {
          label: 'Select Project',
          options: { 'Choose project...': '' }
        }
      );

      this.projectDropdown.on('change', (e) => {
        if (e.value) {
          this.loadProjectById(e.value);
        }
      });

      // Load projects list
      this.loadProjectsList();
    }

    setupDesignTools() {
      // Define all design tools
      const designTools = [
        {
          id: 'partAnalysis',
          title: 'Part Analysis & Scaling',
          description: 'Analyze part geometry and apply scaling factors'
        },
        {
          id: 'partingLine',
          title: 'Parting Line & Split Design',
          description: 'Define parting lines and split surfaces'
        },
        {
          id: 'moldCavity',
          title: 'Mold Cavity Design',
          description: 'Design mold cavities and impressions'
        },
        {
          id: 'runnerGating',
          title: 'Runner & Gating System',
          description: 'Design runner systems and gate locations'
        },
        {
          id: 'ventingSystem',
          title: 'Venting System Design',
          description: 'Create venting channels and air escape routes'
        },
        {
          id: 'ejectionSystem',
          title: 'Ejection System Design',
          description: 'Design ejector pins and ejection mechanisms'
        },
        {
          id: 'moldAssembly',
          title: 'Mold Assembly Features',
          description: 'Add assembly features and alignment guides'
        },
        {
          id: 'slidesCores',
          title: 'Slides/Cores Design',
          description: 'Design slides, cores and undercut solutions'
        }
      ];

      // Create dropdown for each design tool directly in main folder
      designTools.forEach(tool => {
        this.setupDesignTool(this.metalCastingPane, tool);
      });
    }

    setupDesignTool(parentFolder, tool) {
      // Create subfolder for this design tool
      const toolFolder = parentFolder.addFolder({
        title: tool.title,
        expanded: false
      });

      // Store reference to the tool folder
      this.designPanels[tool.id] = {
        folder: toolFolder,
        controls: {}
      };

      // Parameter text area
      const params = { 
        [tool.id + 'Params']: `// ${tool.description}\n// Enter your parameters here...\nwidth: 100\nheight: 50\ndepth: 25\nmaterial: "steel"\n\n// Custom settings:\n// Add your specific parameters below` 
      };
      
      const textInput = toolFolder.addInput(
        params,
        tool.id + 'Params',
        {
          label: 'Parameters',
          multiline: true,
          rows: 4
        }
      );
      this.designPanels[tool.id].controls.textInput = textInput;

      // Parameter slider (generic scaling/intensity factor)
      const sliderParams = { [tool.id + 'Intensity']: 1.0 };
      const slider = toolFolder.addInput(
        sliderParams,
        tool.id + 'Intensity',
        {
          label: 'Intensity/Scale',
          min: 0.1,
          max: 5.0,
          step: 0.1
        }
      );
      this.designPanels[tool.id].controls.slider = slider;

      // Generate button
      const generateBtn = toolFolder.addButton({
        title: `Generate ${tool.title.split(' ')[0]}`
      });
      
      generateBtn.on('click', () => {
        this.executeDesignTool(tool.id, {
          parameters: params[tool.id + 'Params'],
          intensity: sliderParams[tool.id + 'Intensity'],
          toolConfig: tool
        });
      });

      this.designPanels[tool.id].controls.generateBtn = generateBtn;

      // Status monitor for this tool
      const statusObj = { [tool.id + 'Status']: 'Ready' };
      const statusMonitor = toolFolder.addMonitor(
        statusObj,
        tool.id + 'Status',
        { label: 'Status' }
      );
      this.designPanels[tool.id].controls.statusMonitor = statusMonitor;
      this.designPanels[tool.id].statusObj = statusObj;
    }

    async executeDesignTool(toolId, config) {
      console.log(`Executing ${config.toolConfig.title}...`);
      
      // Update status
      this.updateToolStatus(toolId, `⚙️ Processing ${config.toolConfig.title}...`);
      
      try {
        // Parse parameters from text area
        const parsedParams = this.parseParameters(config.parameters);
        
        // Generate the CAD code based on the tool type
        const generatedCode = this.generateCADCode(toolId, parsedParams, config.intensity, config.toolConfig);
        
        // Apply the generated code to Monaco Editor
        if (window.monacoEditor) {
          const currentCode = window.monacoEditor.getValue();
          const newCode = currentCode + '\n\n' + generatedCode;
          window.monacoEditor.setValue(newCode);
          
          // Trigger evaluation
          setTimeout(() => {
            if (window.monacoEditor.evaluateCode) {
              window.monacoEditor.evaluateCode(true);
            }
          }, 100);
        }
        
        this.updateToolStatus(toolId, `✅ ${config.toolConfig.title} completed!`);
        
        // Auto-clear status after 3 seconds
        setTimeout(() => {
          this.updateToolStatus(toolId, 'Ready');
        }, 3000);
        
      } catch (error) {
        console.error(`Error executing ${config.toolConfig.title}:`, error);
        this.updateToolStatus(toolId, `❌ Error: ${error.message}`);
      }
    }

    parseParameters(paramText) {
      const params = {};
      const lines = paramText.split('\n');
      
      lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('//') && line.includes(':')) {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            // Try to parse as number, otherwise keep as string
            if (!isNaN(value) && value !== '') {
              params[key] = parseFloat(value);
            } else {
              params[key] = value.replace(/['"]/g, ''); // Remove quotes
            }
          }
        }
      });
      
      return params;
    }

    generateCADCode(toolId, params, intensity, toolConfig) {
      const baseParams = {
        width: params.width || 100,
        height: params.height || 50,
        depth: params.depth || 25,
        intensity: intensity
      };

      switch (toolId) {
        case 'partAnalysis':
          return `
// ${toolConfig.title} - Generated Code
let analysisScale = ${intensity};
let analyzedPart = sceneShapes.length > 0 ? sceneShapes[0].scale(analysisScale, analysisScale, analysisScale) : Box(${baseParams.width}, ${baseParams.height}, ${baseParams.depth});
sceneShapes.push(analyzedPart.translate([200, 0, 0]));`;

        case 'partingLine':
          return `
// ${toolConfig.title} - Generated Code
let partingPlane = Box(${baseParams.width * 1.2}, 2, ${baseParams.depth * 1.2}).translate([0, ${baseParams.height/2}, 0]);
partingPlane.color = [1, 0, 0, 0.5]; // Red semi-transparent
sceneShapes.push(partingPlane);`;

        case 'moldCavity':
          return `
// ${toolConfig.title} - Generated Code
let moldBlock = Box(${baseParams.width * 1.5}, ${baseParams.height * 1.2}, ${baseParams.depth * 1.5});
let cavity = Box(${baseParams.width}, ${baseParams.height}, ${baseParams.depth});
let moldWithCavity = moldBlock.cut(cavity);
moldWithCavity.color = [0.7, 0.7, 0.7, 0.8];
sceneShapes.push(moldWithCavity.translate([300, 0, 0]));`;

        case 'runnerGating':
          return `
// ${toolConfig.title} - Generated Code
let runnerWidth = ${5 * intensity};
let gateSize = ${3 * intensity};
let runner = Cylinder(runnerWidth/2, ${baseParams.width * 1.2}).rotateZ(90).translate([0, ${baseParams.height + 20}, 0]);
let gate = Cylinder(gateSize/2, 15).translate([0, ${baseParams.height + 5}, 0]);
runner.color = [0, 1, 1, 0.7]; // Cyan
gate.color = [0, 0.8, 1, 0.8]; // Light blue
sceneShapes.push(runner, gate);`;

        case 'ventingSystem':
          return `
// ${toolConfig.title} - Generated Code
let ventChannel = Box(${baseParams.width}, 2, 5);
let ventHoles = [];
for(let i = 0; i < 3; i++) {
  let hole = Cylinder(${1 * intensity}, 20).translate([i * 30 - 30, ${baseParams.height + 10}, 0]);
  hole.color = [1, 1, 0, 0.6]; // Yellow
  ventHoles.push(hole);
}
sceneShapes.push(ventChannel.translate([0, ${baseParams.height + 15}, 0]), ...ventHoles);`;

        case 'ejectionSystem':
          return `
// ${toolConfig.title} - Generated Code
let ejectorPins = [];
let pinDiameter = ${2 * intensity};
for(let i = 0; i < 4; i++) {
  for(let j = 0; j < 2; j++) {
    let pin = Cylinder(pinDiameter/2, ${baseParams.height * 1.5});
    pin = pin.translate([i * 25 - 37.5, -${baseParams.height}, j * 20 - 10]);
    pin.color = [1, 0.5, 0, 0.8]; // Orange
    ejectorPins.push(pin);
  }
}
sceneShapes.push(...ejectorPins);`;

        case 'moldAssembly':
          return `
// ${toolConfig.title} - Generated Code
let guidePin = Cylinder(${3 * intensity}, ${baseParams.height * 2});
let guideBushing = Cylinder(${4 * intensity}, ${baseParams.height * 2}).cut(guidePin);
let locatingRing = Torus(${15 * intensity}, ${2 * intensity});
guidePin.color = [0.5, 0.5, 1, 0.8]; // Light blue
guideBushing.color = [0.8, 0.8, 0.5, 0.7]; // Light yellow
locatingRing.color = [1, 0, 1, 0.6]; // Magenta
sceneShapes.push(
  guidePin.translate([${baseParams.width/2 + 20}, 0, ${baseParams.depth/2 + 20}]),
  guideBushing.translate([${baseParams.width/2 + 20}, 0, ${baseParams.depth/2 + 20}]),
  locatingRing.translate([0, ${baseParams.height + 30}, 0])
);`;

        case 'slidesCores':
          return `
// ${toolConfig.title} - Generated Code
let slideBlock = Box(${20 * intensity}, ${baseParams.height}, ${baseParams.depth + 20});
let core = Cylinder(${8 * intensity}, ${baseParams.depth});
let slideTrack = Box(${25 * intensity}, 5, ${baseParams.depth + 30});
slideBlock.color = [0, 1, 0, 0.7]; // Green
core.color = [1, 0.2, 0.2, 0.8]; // Red
slideTrack.color = [0.5, 0.3, 0.1, 0.6]; // Brown
sceneShapes.push(
  slideBlock.translate([${baseParams.width/2 + 40}, 0, 0]),
  core.rotateY(90).translate([${baseParams.width/2 + 60}, 0, 0]),
  slideTrack.translate([${baseParams.width/2 + 40}, ${baseParams.height + 10}, 0])
);`;

        default:
          return `
// Generic tool implementation
let generatedShape = Box(${baseParams.width * intensity}, ${baseParams.height * intensity}, ${baseParams.depth * intensity});
generatedShape.color = [Math.random(), Math.random(), Math.random(), 0.7];
sceneShapes.push(generatedShape.translate([100 * Math.random(), 100 * Math.random(), 0]));`;
      }
    }

    updateToolStatus(toolId, message) {
      if (this.designPanels[toolId] && this.designPanels[toolId].statusObj) {
        const statusKey = toolId + 'Status';
        this.designPanels[toolId].statusObj[statusKey] = message;
        if (this.designPanels[toolId].controls.statusMonitor) {
          this.designPanels[toolId].controls.statusMonitor.refresh(this.designPanels[toolId].statusObj);
        }
      }
    }
  
    async loadProjectsList() {
      try {
        if (!this.service.getAllProjects) {
          console.warn('getAllProjects method not available on service');
          return;
        }
        
        const data = await this.service.getAllProjects();
        
        if (this.projectDropdown && data.projects) {
          const options = { 'Choose project...': '' };
          data.projects.forEach(p => {
            options[p.name] = p.id;
          });
          
          this.projectDropdown.dispose();
          this.projectDropdown = this.designPanels.projectFolder?.addInput(
            { selectedProject: '' }, 
            'selectedProject',
            {
              label: 'Select Project',
              options: options
            }
          );
          
          if (this.projectDropdown) {
            this.projectDropdown.on('change', (e) => {
              if (e.value) {
                this.loadProjectById(e.value);
              }
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load projects list:', error);
      }
    }
  
    async loadRandomProject() {
      if (this.isLoading) return;
      
      this.setLoading(true);
      console.log('🎲 Loading random project...');
      
      try {
        if (!this.service.getRandomProject) {
          throw new Error('getRandomProject method not available');
        }
        
        const project = await this.service.getRandomProject();
        await this.service.initializeCascadeStudioWithProject(project.id);
        console.log('✅ Random model loaded successfully!');
      } catch (error) {
        console.error(`❌ Failed to load random project: ${error.message}`);
      } finally {
        this.setLoading(false);
      }
    }
  
    async loadProjectById(id) {
      if (this.isLoading) return;
      
      this.setLoading(true);
      console.log(`Loading project ${id}...`);
      
      try {
        await this.service.initializeCascadeStudioWithProject(id);
        console.log('✅ Project loaded successfully!');
      } catch (error) {
        console.error(`❌ Failed to load project: ${error.message}`);
      } finally {
        this.setLoading(false);
      }
    }
  
    setLoading(loading) {
      this.isLoading = loading;
    }
    
    destroy() {
      this.metalCastingPane = null;
      this.guiInstanceId = null;
      this.designPanels = {};
    }
  }
  
  // Enhanced CSS for the comprehensive design suite
  function addMetalCastingStyles() {
    if (document.getElementById('mc-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mc-styles';
    style.textContent = `
      .tp-fldv_t[data-title*="Aestus Toolkit"] {
        background: linear-gradient(135deg, rgba(76,175,80,0.15), rgba(69,160,73,0.08)) !important;
        border-left: 4px solid #4CAF50 !important;
        box-shadow: 0 2px 8px rgba(76,175,80,0.2) !important;
      }
      
      .tp-btnv_b[data-title*="Generate"] {
        background: linear-gradient(135deg, rgba(255,87,34,0.9), rgba(244,67,54,1)) !important;
        color: white !important;
        font-weight: 600 !important;
        border: none !important;
        border-radius: 4px !important;
        margin-top: 4px !important;
      }
      
      .tp-btnv_b[data-title*="Generate"]:hover {
        background: linear-gradient(135deg, rgba(255,87,34,1), rgba(244,67,54,1)) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 12px rgba(255,87,34,0.4) !important;
      }
      
      /* Design tool folder styling */
      .tp-fldv_t[data-title*="Part Analysis"], .tp-fldv_t[data-title*="Parting Line"], 
      .tp-fldv_t[data-title*="Mold Cavity"], .tp-fldv_t[data-title*="Runner"], 
      .tp-fldv_t[data-title*="Venting"], .tp-fldv_t[data-title*="Ejection"], 
      .tp-fldv_t[data-title*="Mold Assembly"], .tp-fldv_t[data-title*="Slides"] {
        background: linear-gradient(135deg, rgba(156,39,176,0.08), rgba(142,36,170,0.04)) !important;
        border-left: 2px solid #9C27B0 !important;
        margin: 2px 0 !important;
      }
      
      /* Text area styling */
      .tp-iptv_i[type="text"] {
        background: rgba(30,30,30,0.8) !important;
        border: 1px solid rgba(76,175,80,0.3) !important;
        color: #E0E0E0 !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  let metalCastingUI = null;
  
  function initializeMetalCasting() {
    addMetalCastingStyles();
    
    if (metalCastingUI) {
      metalCastingUI.destroy();
    }
    
    metalCastingUI = new MetalCastingUI();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMetalCasting);
  } else {
    initializeMetalCasting();
  }
  
  console.log('Aestus Toolkit loaded - CAD Design Tools Ready!');