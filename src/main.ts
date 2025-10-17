import "./style.css";

// --- Setup ---
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.appendChild(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "sketchpad";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context not available");

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
document.body.appendChild(clearBtn);

// --- Data Structures ---
let currentLine: Array<{ x: number; y: number }> = [];
const displayList: Array<Array<{ x: number; y: number }>> = [];

// --- Observer Pattern ---
// Redraw whenever drawing changes
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  displayList.forEach((line) => {
    if (line.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length; i++) {
      ctx.lineTo(line[i].x, line[i].y);
    }
    ctx.stroke();
  });
});

// --- Mouse Event Handlers ---
canvas.addEventListener("mousedown", (e) => {
  currentLine = [{ x: e.offsetX, y: e.offsetY }];
});

canvas.addEventListener("mousemove", (e) => {
  if (!currentLine.length) return;
  currentLine.push({ x: e.offsetX, y: e.offsetY });
  // Notify that drawing has changed
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseup", () => {
  if (currentLine.length > 1) {
    displayList.push(currentLine);
  }
  currentLine = [];
});

canvas.addEventListener("mouseleave", () => {
  if (currentLine.length > 1) {
    displayList.push(currentLine);
  }
  currentLine = [];
});

// --- Clear Button ---
clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  canvas.dispatchEvent(new Event("drawing-changed"));
});
