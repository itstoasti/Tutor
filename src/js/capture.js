// Screen capture functionality
class ScreenCapture {
  constructor() {
    this.isCapturing = false;
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { x: 0, y: 0 };
    this.overlay = null;
    this.selectionBox = null;
    this.feedback = null;
  }

  initialize() {
    this.createOverlay();
    this.setupEventListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'screen-capture-overlay';
    
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'selection-box';
    this.overlay.appendChild(this.selectionBox);

    const instructions = document.createElement('div');
    instructions.className = 'capture-instructions';
    instructions.textContent = 'Click and drag to select an area';
    this.overlay.appendChild(instructions);

    document.body.appendChild(this.overlay);
  }

  setupEventListeners() {
    this.overlay.addEventListener('mousedown', this.startCapture.bind(this));
    document.addEventListener('mousemove', this.updateCapture.bind(this));
    document.addEventListener('mouseup', this.endCapture.bind(this));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cleanup();
    });
  }

  startCapture(e) {
    this.isCapturing = true;
    this.startPos = { x: e.clientX, y: e.clientY };
    this.currentPos = { x: e.clientX, y: e.clientY };
  }

  updateCapture(e) {
    if (!this.isCapturing) return;
    
    this.currentPos = { x: e.clientX, y: e.clientY };
    
    const left = Math.min(this.startPos.x, this.currentPos.x);
    const top = Math.min(this.startPos.y, this.currentPos.y);
    const width = Math.abs(this.currentPos.x - this.startPos.x);
    const height = Math.abs(this.currentPos.y - this.startPos.y);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
    this.selectionBox.style.display = 'block';
  }

  showFeedback(message) {
    if (this.feedback) {
      this.feedback.remove();
    }
    
    this.feedback = document.createElement('div');
    this.feedback.className = 'capture-feedback';
    this.feedback.innerHTML = `
      <div class="capture-spinner"></div>
      <div class="capture-message">${message}</div>
    `;
    
    document.body.appendChild(this.feedback);
  }

  showAnswer(content) {
    const answerBox = document.createElement('div');
    answerBox.className = 'capture-answer';
    answerBox.innerHTML = `
      <div class="answer-content">${content}</div>
      <button class="close-answer">Close</button>
    `;
    
    document.body.appendChild(answerBox);
    
    // Add close button handler
    const closeButton = answerBox.querySelector('.close-answer');
    const handleClose = () => {
      answerBox.remove();
      document.removeEventListener('keydown', handleEscape);
    };
    
    closeButton.addEventListener('click', handleClose);
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  async endCapture() {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    this.showFeedback('Analyzing image...');

    try {
      // Capture the screen
      const imageData = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'captureScreen' }, (dataUrl) => {
          resolve(dataUrl);
        });
      });

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const rect = this.selectionBox.getBoundingClientRect();

      img.onload = async () => {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;

        ctx.drawImage(
          img,
          rect.left * window.devicePixelRatio,
          rect.top * window.devicePixelRatio,
          rect.width * window.devicePixelRatio,
          rect.height * window.devicePixelRatio,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const croppedImageData = canvas.toDataURL('image/png');
        
        // Send the cropped image for analysis
        chrome.runtime.sendMessage({
          action: 'analyzeImage',
          imageData: croppedImageData
        }, (response) => {
          if (this.feedback) {
            this.feedback.remove();
          }
          
          if (response.error) {
            this.showAnswer(`Error: ${response.error}`);
          } else if (response.answer) {
            this.showAnswer(response.answer);
          }
          
          this.cleanup();
        });
      };

      img.src = imageData;

    } catch (error) {
      console.error('Capture error:', error);
      if (this.feedback) {
        this.feedback.remove();
      }
      this.showAnswer(`Error: ${error.message}`);
      this.cleanup();
    }
  }

  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
    }
    document.removeEventListener('mousemove', this.updateCapture.bind(this));
    document.removeEventListener('mouseup', this.endCapture.bind(this));
  }
}

// Initialize capture when requested
window.startScreenCapture = function() {
  const capture = new ScreenCapture();
  capture.initialize();
};