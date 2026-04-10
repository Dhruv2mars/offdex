export const MASCOT_GRID = [
  ".......##########.......",
  "......############......",
  ".....##############.....",
  "....############W###....",
  "...####WWW####WW#####...",
  "...####WWW##WW#######...",
  "...####WWW####WW#####...",
  "...#############W####...",
  "...##################...",
  "...##################...",
  "...####..........####...",
  "...####..........####...",
];

export const MASCOT_BLINK_GRID = [
  ".......##########.......",
  "......############......",
  ".....##############.....",
  "....################....",
  "...##################...",
  "...####WWW####WW#####...",
  "...##################...",
  "...##################...",
  "...##################...",
  "...##################...",
  "...####..........####...",
  "...####..........####...",
];

type MascotTerminalEnv = {
  NO_COLOR?: string;
  TERM?: string;
};

export function shouldRenderAnsiMascot(
  env: MascotTerminalEnv = {
    NO_COLOR: process.env.NO_COLOR,
    TERM: process.env.TERM,
  },
  isTTY: boolean = process.stdout.isTTY
) {
  return Boolean(isTTY) &&
    env.NO_COLOR !== "1" &&
    env.NO_COLOR !== "true" &&
    env.TERM !== "dumb";
}

export function renderMascot(grid: string[], useAnsi: boolean = shouldRenderAnsiMascot()) {
  return grid.map((row) => {
    return [...row].map((cell) => {
      if (cell === ".") return "  ";
      if (!useAnsi) return cell === "W" ? "  " : "██"; // Fallback for tests and plain terminals
      const bg = cell === "#" ? "48;2;64;64;64" : "48;2;255;255;255";
      return `\x1b[${bg}m  \x1b[0m`;
    }).join("");
  }).join("\n");
}
