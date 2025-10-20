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

// --- Buttons ---
const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
document.body.appendChild(clearBtn);

const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
document.body.appendChild(undoBtn);

const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
document.body.appendChild(redoBtn);

// --- Interfaces & Classes (Command Pattern) ---
interface Command {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerCommand implements Command {
  private points: { x: number; y: number }[] = [];

  constructor(startX: number, startY: number) {
    this.points.push({ x: startX, y: startY });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 1) return;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
  }
}

// --- Data Structures ---
const displayList: Command[] = [];
const redoStack: Command[] = [];
let currentCommand: MarkerCommand | null = null;
let pendingRedraw = false;

// --- Observer Pattern (Redraw when drawing changes) ---
canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) {
    cmd.display(ctx);
  }
});

// --- Mouse Event Handlers ---
canvas.addEventListener("mousedown", (e) => {
  currentCommand = new MarkerCommand(e.offsetX, e.offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  if (!currentCommand) return;
  currentCommand.drag(e.offsetX, e.offsetY);

  // Throttle redraws to avoid performance spikes
  if (!pendingRedraw) {
    pendingRedraw = true;
    queueMicrotask(() => {
      canvas.dispatchEvent(new Event("drawing-changed"));
      pendingRedraw = false;
    });
  }
});

canvas.addEventListener("mouseup", () => {
  if (currentCommand) {
    displayList.push(currentCommand);
    currentCommand = null;
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

canvas.addEventListener("mouseleave", () => {
  if (currentCommand) {
    displayList.push(currentCommand);
    currentCommand = null;
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// --- Undo / Redo / Clear Buttons ---
undoBtn.addEventListener("click", () => {
  if (displayList.length > 0) {
    const last = displayList.pop();
    if (last) redoStack.push(last);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const restored = redoStack.pop()!;
    displayList.push(restored);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// --- Initial Paint ---
canvas.dispatchEvent(new Event("drawing-changed"));

console.log("Step 5 complete: Refactored to use Command pattern ✅");
