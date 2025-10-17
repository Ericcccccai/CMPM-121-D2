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
const redoStack: Array<Array<{ x: number; y: number }>> = [];
let pendingRedraw = false;

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
// --- Mouse Event Handlers ---
canvas.addEventListener("mousedown", (e) => {
  currentLine = [{ x: e.offsetX, y: e.offsetY }];
});

canvas.addEventListener("mousemove", (e) => {
  if (!currentLine.length) return;
  currentLine.push({ x: e.offsetX, y: e.offsetY });
  // Throttle redraw
  if (!pendingRedraw) {
    pendingRedraw = true;
    queueMicrotask(() => {
      canvas.dispatchEvent(new Event("drawing-changed"));
      pendingRedraw = false;
    });
  }
});

canvas.addEventListener("mouseup", () => {
  if (currentLine.length > 1) {
    displayList.push(currentLine);
  }
  currentLine = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

canvas.addEventListener("mouseleave", () => {
  if (currentLine.length > 1) {
    displayList.push(currentLine);
  }
  currentLine = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- undo button ---
const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
undoBtn.addEventListener("click", () => {
  if (displayList.length > 0) {
    const lastLine = displayList.pop();
    if (lastLine) {
      redoStack.push(lastLine);
      canvas.dispatchEvent(new Event("drawing-changed"));
    }
  }
});
document.body.appendChild(undoBtn);

// --- redo button ---
const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
redoBtn.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const line = redoStack.pop()!;
    displayList.push(line);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});
document.body.appendChild(redoBtn);

// --- Clear Button ---
clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  canvas.dispatchEvent(new Event("drawing-changed"));
});
