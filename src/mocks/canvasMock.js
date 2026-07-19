class ImageMock {}

const createCanvas = () => ({
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
});

const loadImage = async () => ({ width: 0, height: 0 });

module.exports = {
  Image: ImageMock,
  createCanvas,
  loadImage
};
