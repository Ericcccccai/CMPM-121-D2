import "./style.css";

// === Setup ===
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.appendChild(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "sketchpad";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
const controls: HTMLButtonElement[] = [];

// --- Utility for adding buttons ---
function makeButton(label: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  document.body.appendChild(btn);
  controls.push(btn);
  return btn;
}

// === Buttons ===
const clearBtn = makeButton("Clear");
const undoBtn = makeButton("Undo");
const redoBtn = makeButton("Redo");

const thinBtn = makeButton("Thin Marker");
const thickBtn = makeButton("Thick Marker");

// --- Sticker Buttons (Step 8) ---
const stickerButtons: HTMLButtonElement[] = [];
const stickerChoices = ["🦋", "🐞", "🌼"];
stickerChoices.forEach((emoji) => {
  const btn = makeButton(emoji);
  stickerButtons.push(btn);
});

// === Command Interfaces ===
interface Draggable {
  drag(x: number, y: number): void;
}

interface Command {
  display(ctx: CanvasRenderingContext2D): void;
}

interface MarkerStyle {
  thickness: number;
  color: string;
}

// === Marker Command ===
class MarkerCommand implements Command, Draggable {
  private points: { x: number; y: number }[] = [];
  constructor(private style: MarkerStyle, startX: number, startY: number) {
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

// === Sticker Command (new) ===
class StickerCommand implements Command, Draggable {
  constructor(
    private emoji: string,
    private x: number,
    private y: number,
    private scale = 1,
  ) {}
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = `${
      32 * this.scale
    }px system-ui, Apple Color Emoji, Segoe UI Emoji`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

// === Preview Commands ===
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
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.style.thickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.style.color;
    ctx.fill();
    ctx.restore();
  }
}

class StickerPreview implements Command {
  constructor(private emoji: string, private x: number, private y: number) {}
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.font = `32px system-ui, Apple Color Emoji, Segoe UI Emoji`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

// === State ===
const displayList: Command[] = [];
const redoStack: Command[] = [];
let currentCommand: Command | null = null;
let preview: Command | null = null;
let pendingRedraw = false;

// --- Tool Mode ---
type Tool = "marker" | "sticker";
let currentTool: Tool = "marker";
let currentStyle: MarkerStyle = { thickness: 2, color: "#000" };
let currentSticker = "🦋";

// === Helpers ===
function setActiveToolButton(btn: HTMLButtonElement) {
  controls.forEach((b) => b.classList.remove("selectedTool"));
  btn.classList.add("selectedTool");
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of displayList) cmd.display(ctx);
  if (!currentCommand && preview) preview.display(ctx);
}

// === Events ===
canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

canvas.addEventListener("mousedown", (e) => {
  const { offsetX: x, offsetY: y } = e;
  if (currentTool === "marker") {
    currentCommand = new MarkerCommand(currentStyle, x, y);
  } else {
    currentCommand = new StickerCommand(currentSticker, x, y);
  }
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX: x, offsetY: y } = e;
  if (
    currentCommand instanceof MarkerCommand ||
    currentCommand instanceof StickerCommand
  ) {
    (currentCommand as Draggable).drag?.(x, y);
    if (!pendingRedraw) {
      pendingRedraw = true;
      queueMicrotask(() => {
        canvas.dispatchEvent(new Event("drawing-changed"));
        pendingRedraw = false;
      });
    }
  } else {
    // preview update
    if (currentTool === "marker") {
      if (!(preview instanceof MarkerPreview)) {
        preview = new MarkerPreview(currentStyle, x, y);
      }
      (preview as MarkerPreview).setPosition(x, y);
    } else {
      if (!(preview instanceof StickerPreview)) {
        preview = new StickerPreview(currentSticker, x, y);
      }
      (preview as StickerPreview).setPosition(x, y);
    }
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
  preview = null;
  canvas.dispatchEvent(new Event("tool-moved"));
});

// === Undo / Redo / Clear ===
undoBtn.addEventListener("click", () => {
  const last = displayList.pop();
  if (last) redoStack.push(last);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

redoBtn.addEventListener("click", () => {
  const restored = redoStack.pop();
  if (restored) displayList.push(restored);
  canvas.dispatchEvent(new Event("drawing-changed"));
});

clearBtn.addEventListener("click", () => {
  displayList.length = 0;
  redoStack.length = 0;
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// === Tool Button Logic ===
thinBtn.addEventListener("click", () => {
  currentTool = "marker";
  currentStyle = { thickness: 2, color: "#000" };
  setActiveToolButton(thinBtn);
});
thickBtn.addEventListener("click", () => {
  currentTool = "marker";
  currentStyle = { thickness: 8, color: "#000" };
  setActiveToolButton(thickBtn);
});
stickerButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    currentTool = "sticker";
    currentSticker = stickerChoices[i];
    setActiveToolButton(btn);
  });
});

// === Initialize ===
setActiveToolButton(thinBtn);
canvas.dispatchEvent(new Event("drawing-changed"));
console.log("Step 8 complete: Multiple stickers added ✅");
