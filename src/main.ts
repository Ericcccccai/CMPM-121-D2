import "./style.css";

// Create app title
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.appendChild(title);

// Create canvas
const canvas = document.createElement("canvas");
canvas.width = 800;
canvas.height = 400;
canvas.id = "sketchpad";
document.body.appendChild(canvas);

// Get 2D drawing context
const ctx = canvas.getContext("2d");
if (!ctx) {
  console.error("2D context not supported");
  throw new Error("Canvas 2D context not available");
}

// Drawing state
let isDrawing = false;

// Mouse event handlers
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

// Add Clear button
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
document.body.appendChild(clearBtn);
