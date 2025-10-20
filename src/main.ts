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

const ctx = canvas.getContext("2d")!;
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

// --- Tool Buttons (Step 6) ---
const thinBtn = document.createElement("button");
thinBtn.textContent = "Thin Marker";
document.body.appendChild(thinBtn);

const thickBtn = document.createElement("button");
thickBtn.textContent = "Thick Marker";
document.body.appendChild(thickBtn);

// --- Interfaces & Classes ---
interface Command {
  display(ctx: CanvasRenderingContext2D): void;
}

interface MarkerStyle {
  thickness: number;
  color: string;
}

class MarkerCommand implements Command {
  private points: { x: number; y: number }[] = [];
  private style: MarkerStyle;

  constructor(style: MarkerStyle, startX: number, startY: number) {
    this.style = style;
    this.points.push({ x: startX, y: startY });
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 1) return;
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = this.style.thickness;
    ctx.strokeStyle = this.style.color;
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
  }
}

// --- Step 7: Tool Preview Command ---
class MarkerPreview implements Command {
  constructor(
    private style: MarkerStyle,
    private x: number,
    private y: number,
  ) {}
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.35; // semi-transparent
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.style.thickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.style.color;
    ctx.fill();
    ctx.restore();
  }
}

// --- Data Structures ---
const displayList: Command[] = [];
const redoStack: Command[] = [];
let currentCommand: MarkerCommand | null = null;
let preview: MarkerPreview | null = null;
let pendingRedraw = false;

// --- Current Tool Style ---
let currentStyle: MarkerStyle = { thickness: 2, color: "#000000" };

function setActiveToolButton(activeBtn: HTMLButtonElement) {
  [thinBtn, thickBtn].forEach((btn) => btn.classList.remove("selectedTool"));
  activeBtn.classList.add("selectedTool");
}

// --- Redraw Handler (Observer Pattern) ---
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all commands
  for (const cmd of displayList) cmd.display(ctx);

  // Draw preview only when mouse is not down
  if (!currentCommand && preview) preview.display(ctx);
}

canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// --- Mouse Event Handlers ---
canvas.addEventListener("mousedown", (e) => {
  currentCommand = new MarkerCommand(currentStyle, e.offsetX, e.offsetY);
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX: x, offsetY: y } = e;

  // When drawing, keep adding points
  if (currentCommand) {
    currentCommand.drag(x, y);
    if (!pendingRedraw) {
      pendingRedraw = true;
      queueMicrotask(() => {
        canvas.dispatchEvent(new Event("drawing-changed"));
        pendingRedraw = false;
      });
    }
  } else {
    // When not drawing, update preview position
    if (!preview) preview = new MarkerPreview(currentStyle, x, y);
    preview.setPosition(x, y);
    canvas.dispatchEvent(new Event("tool-moved"));
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
  preview = null; // hide preview when cursor leaves canvas
  canvas.dispatchEvent(new Event("tool-moved"));
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

// --- Tool Buttons ---
thinBtn.addEventListener("click", () => {
  currentStyle = { thickness: 2, color: "#000000" };
  setActiveToolButton(thinBtn);
});

thickBtn.addEventListener("click", () => {
  currentStyle = { thickness: 8, color: "#000000" };
  setActiveToolButton(thickBtn);
});

// --- Initialize ---
setActiveToolButton(thinBtn);
canvas.dispatchEvent(new Event("drawing-changed"));

console.log("Step 7 complete: Tool preview implemented ✅");
