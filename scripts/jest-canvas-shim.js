const Module = require('module');

const canvasMock = {
  Image: class ImageMock {},
  createCanvas: () => ({
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {}
    }),
    toBuffer: () => Buffer.from(''),
    toDataURL: () => ''
  }),
  loadImage: async () => ({ width: 0, height: 0 })
};

const originalLoad = Module._load;
Module._load = function patchedModuleLoad(request, parent, isMain) {
  if (request === 'canvas') {
    return canvasMock;
  }
  return originalLoad.call(this, request, parent, isMain);
};
