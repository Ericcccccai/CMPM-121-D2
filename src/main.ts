import "./style.css";

// === Setup ===
const title = document.createElement("h1");
title.textContent = "Sticker Sketchpad";
document.body.appendChild(title);

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
canvas.id = "sketchpad";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
const controls: HTMLButtonElement[] = [];

// --- Utility for adding buttons ---
function makeButton(
  label: string,
  parent: HTMLElement = document.body,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  parent.appendChild(btn);
  controls.push(btn);
  return btn;
}

// === UI Containers ===
const controlBar = document.createElement("div");
controlBar.className = "control-bar";
document.body.appendChild(controlBar);

const markerGroup = document.createElement("div");
markerGroup.className = "button-group";
controlBar.appendChild(markerGroup);

const stickerGroup = document.createElement("div");
stickerGroup.className = "button-group";
controlBar.appendChild(stickerGroup);

// === Buttons ===
const clearBtn = makeButton("Clear", markerGroup);
const undoBtn = makeButton("Undo", markerGroup);
const redoBtn = makeButton("Redo", markerGroup);
const exportBtn = makeButton("Export", markerGroup);

const thinBtn = makeButton("Thin Marker", markerGroup);
const thickBtn = makeButton("Thick Marker", markerGroup);

// --- Sticker Buttons (Step 8) ---
const stickerButtons: HTMLButtonElement[] = [];
const stickerChoices = ["🦋", "🐞", "🌼"];
stickerChoices.forEach((emoji) => {
  const btn = makeButton(emoji, stickerGroup);
  stickerButtons.push(btn);
});

// --- Custom Sticker Button (Step 9) ---
const customBtn = makeButton("➕ Custom Sticker", stickerGroup);
customBtn.addEventListener("click", () => {
  const userInput = prompt("Enter your custom sticker (emoji or text):", "🧽");
  if (userInput) {
    // add to sticker list
    stickerChoices.push(userInput);

    // create new button
    const newBtn = makeButton(userInput);
    stickerButtons.push(newBtn);

    // make it work like others
    newBtn.addEventListener("click", () => {
      currentTool = "sticker";
      currentSticker = userInput;
      setActiveToolButton(newBtn);
    });
  }
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

// === Export Button (Step 10) ===
exportBtn.addEventListener("click", () => {
  // Create a 4x-larger canvas
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;

  // Scale drawing operations (4x)
  exportCtx.scale(4, 4);

  // Redraw all saved commands at higher resolution
  for (const cmd of displayList) {
    cmd.display(exportCtx);
  }

  // Trigger file download
  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = "sketchpad.png";
  link.click();
});

// === Tool Button Logic ===
thinBtn.addEventListener("click", () => {
  currentTool = "marker";
  currentStyle = { thickness: 3, color: "#222" }; // slightly thicker + darker
  setActiveToolButton(thinBtn);
});
thickBtn.addEventListener("click", () => {
  currentTool = "marker";
  currentStyle = { thickness: 10, color: "#222" };
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
