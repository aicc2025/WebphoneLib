import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();

// Setup MediaStream before navigator
global.MediaStream = class MediaStream {
  constructor() {
    this.id = 'mock-stream-id';
    this.active = true;
  }
  getTracks() {
    return [];
  }
};

// Create mock navigator with mediaDevices
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
  mediaDevices: {
    getUserMedia: () => Promise.resolve(new MediaStream()),
    enumerateDevices: () => Promise.resolve([]),
  },
};

// Set window.navigator using defineProperty (happy-dom's navigator is readonly)
Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
});

// In Node.js 22, global.navigator is read-only, so we need to use defineProperty
Object.defineProperty(global, 'window', {
  value: window,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'document', {
  value: window.document,
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
});

global.RTCPeerConnection = class RTCPeerConnection {
  constructor() {
    this.onconnectionstatechange = null;
    this.connectionState = 'new';
  }

  createOffer() {
    return Promise.resolve({});
  }

  createAnswer() {
    return Promise.resolve({});
  }

  setLocalDescription() {
    return Promise.resolve();
  }

  setRemoteDescription() {
    return Promise.resolve();
  }

  addIceCandidate() {
    return Promise.resolve();
  }

  getStats() {
    return Promise.resolve(new Map());
  }
};

// Critical: This ensures Features.checkRequired() passes
Object.defineProperty(global.RTCPeerConnection.prototype, 'onconnectionstatechange', {
  value: null,
  writable: true,
  configurable: true,
});

global.AudioContext = class AudioContext {};
global.webkitAudioContext = global.AudioContext;

global.Audio = class Audio {
  setSinkId() {
    return Promise.resolve();
  }
};

window.AudioContext = global.AudioContext;
window.webkitAudioContext = global.webkitAudioContext;
window.RTCPeerConnection = global.RTCPeerConnection;
window.MediaStream = global.MediaStream;
window.Audio = global.Audio;

window.location = {
  hostname: 'localhost',
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
};
