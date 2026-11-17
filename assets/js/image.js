/* Loading source images into a canvas and extracting luminance. */
import { $, doc } from './state.js';

export function loadCanvas(cv) {
  doc.W = cv.width;
  doc.H = cv.height;
  doc.srcColor = cv.toDataURL('image/png');

  const ctx = cv.getContext('2d');
  const data = ctx.getImageData(0, 0, doc.W, doc.H).data;
  doc.lum0 = new Float32Array(doc.W * doc.H);

  const grayCv = document.createElement('canvas');
  grayCv.width = doc.W;
  grayCv.height = doc.H;
  const gCtx = grayCv.getContext('2d');
  const gImg = gCtx.createImageData(doc.W, doc.H);
  const gd = gImg.data;

  for (let i = 0; i < doc.W * doc.H; i++) {
    const y = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    doc.lum0[i] = y;
    gd[i * 4] = gd[i * 4 + 1] = gd[i * 4 + 2] = Math.round(y);
    gd[i * 4 + 3] = 255;
  }

  gCtx.putImageData(gImg, 0, 0);
  doc.srcGray = grayCv.toDataURL('image/png');
  $('dim').textContent = doc.W + ' × ' + doc.H + ' px · luminance sampled';
}

/* A synthetic still life so the app is useful before any file is chosen. */
export function sampleImage() {
  const cv = document.createElement('canvas');
  cv.width = 480;
  cv.height = 600;
  const c = cv.getContext('2d');

  let g = c.createLinearGradient(0, 0, 480, 600);
  g.addColorStop(0, '#bbb');
  g.addColorStop(1, '#222');
  c.fillStyle = g;
  c.fillRect(0, 0, 480, 600);

  c.fillStyle = 'rgba(0,0,0,.55)';
  c.beginPath();
  c.ellipse(290, 470, 170, 40, -0.1, 0, 7);
  c.fill();

  g = c.createRadialGradient(190, 220, 10, 230, 280, 170);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.5, '#888');
  g.addColorStop(1, '#111');
  c.fillStyle = g;
  c.beginPath();
  c.arc(230, 290, 160, 0, 7);
  c.fill();

  c.fillStyle = '#ddd';
  c.beginPath();
  c.moveTo(300, 330);
  c.lineTo(450, 300);
  c.lineTo(450, 450);
  c.lineTo(310, 480);
  c.fill();

  c.fillStyle = '#333';
  c.beginPath();
  c.moveTo(300, 330);
  c.lineTo(310, 480);
  c.lineTo(260, 440);
  c.lineTo(255, 360);
  c.fill();

  const im = c.getImageData(0, 0, 480, 600);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 40;
    im.data[i] += n;
    im.data[i + 1] += n;
    im.data[i + 2] += n;
  }
  c.putImageData(im, 0, 0);
  return cv;
}

/* Read a picked file into a canvas, downscaled to keep tracing responsive. */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 680 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    img.src = url;
  });
}
