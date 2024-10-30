export class ScreenCapture {
  constructor() {
    this.isCapturing = false;
    this.overlay = null;
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { x: 0, y: 0 };
  }

  async initialize() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'screen-capture-overlay';
    
    const selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    this.overlay.appendChild(selectionBox);

    document.body.appendChild(this.overlay);

    this.overlay.addEventListener('mousedown', this.startCapture.bind(this));
    this.overlay.addEventListener('mousemove', this.updateCapture.bind(this));
    this.overlay.addEventListener('mouseup', this.endCapture.bind(this));
  }

  startCapture(e) {
    this.isCapturing = true;
    this.startPos = { x: e.clientX, y: e.clientY };
    this.currentPos = { x: e.clientX, y: e.clientY };
  }

  updateCapture(e) {
    if (!this.isCapturing) return;
    
    this.currentPos = { x: e.clientX, y: e.clientY };
    const selectionBox = this.overlay.querySelector('.selection-box');
    
    const left = Math.min(this.startPos.x, this.currentPos.x);
    const top = Math.min(this.startPos.y, this.currentPos.y);
    const width = Math.abs(this.currentPos.x - this.startPos.x);
    const height = Math.abs(this.currentPos.y - this.startPos.y);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.display = 'block';
  }

  async endCapture() {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    const selectionBox = this.overlay.querySelector('.selection-box');
    const rect = selectionBox.getBoundingClientRect();

    // Capture the selected area
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Get the screenshot and draw the selected portion
    const screenshot = await chrome.tabs.captureVisibleTab();
    const img = new Image();
    img.src = screenshot;
    await new Promise(resolve => img.onload = resolve);
    
    context.drawImage(
      img,
      rect.left * window.devicePixelRatio,
      rect.top * window.devicePixelRatio,
      rect.width * window.devicePixelRatio,
      rect.height * window.devicePixelRatio,
      0, 0, rect.width, rect.height
    );

    const imageData = canvas.toDataURL('image/png');
    
    // Clean up
    this.overlay.remove();
    
    return imageData;
  }
}