import { world, system } from "@minecraft/server";

let isplace = true;
let isstart = false;
let originX = 0;
let originY = 0;
let originZ = 0;

// Track previous board location
let previousOriginX = null;
let previousOriginY = null;
let previousOriginZ = null;

let board = [
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "W", "B", "", "", ""],
  ["", "", "", "B", "W", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "", "", "", "", ""],
];

system.runTimeout(() => {
  if(world.getDynamicProperty("OthelloData") !== undefined) {
    let OthelloData = JSON.parse(world.getDynamicProperty("OthelloData"));
    isplace = OthelloData.isplace;
    isstart = OthelloData.isstart;
    originX = OthelloData.originX;
    originY = OthelloData.originY;
    originZ = OthelloData.originZ;
    board = OthelloData.board;
    previousOriginX = OthelloData.previousOriginX;
    previousOriginY = OthelloData.previousOriginY;
    previousOriginZ = OthelloData.previousOriginZ;
  }
})

const boardrender = () => {

  const overworld = world.getDimension("overworld");

  function runNextIteration(i, j) {
    system.runTimeout(() => {
      const x = originX + i;
      const y = originY;
      const z = originZ + j;
      if (board[i][j] === "")
        overworld.runCommand(`setblock ${x} ${y} ${z} green_wool`);
      if (board[i][j] === "W")
        overworld.runCommand(`setblock ${x} ${y} ${z} white_wool`);
      if (board[i][j] === "B")
        overworld.runCommand(`setblock ${x} ${y} ${z} black_wool`);

      j++;
      if (j < board[i].length) {
        runNextIteration(i, j);
      } else {
        j = 0;
        i++;

        if (i < board.length) {
          system.runTimeout(() => {
            runNextIteration(i, j);
          }, 0);
        }
      }
    }, 0);
  }

  runNextIteration(0, 0);
};

// FlipPieces function remains the same
function flipPieces(x, y, currentPlayer) {
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  const opponent = currentPlayer === "W" ? "B" : "W";
  let flipped = [];

  for (const [dx, dy] of directions) {
    let i = 1;
    let flippable = [];
    let x2 = x + dx,
      y2 = y + dy;

    while (
      x2 >= 0 &&
      x2 < 8 &&
      y2 >= 0 &&
      y2 < 8 &&
      board[y2][x2] === opponent
    ) {
      flippable.push({ x: x2, y: y2 });
      x2 += dx;
      y2 += dy;
      i++;
    }

    if (
      i > 1 &&
      x2 >= 0 &&
      x2 < 8 &&
      y2 >= 0 &&
      y2 < 8 &&
      board[y2][x2] === currentPlayer
    ) {
      flipped = flipped.concat(flippable);
    }
  }
  for (const { x: x2, y: y2 } of flipped) {
    board[y2][x2] = currentPlayer;
  }
  boardrender();
}

// Other helper functions remain the same
function placeBestBlackPiece() {
  let bestScore = -Infinity;
  let bestMove = null;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x] === "") {
        const score = evaluateMove(x, y, "B");
        if (score > bestScore) {
          bestScore = score;
          bestMove = { x, y };
        }
      }
    }
  }

  if (bestMove) {
    board[bestMove.y][bestMove.x] = "B";
    flipPieces(bestMove.x, bestMove.y, "B");
  }

  isplace = true;

  world.setDynamicProperty("OthelloData", JSON.stringify({
    isplace,
    isstart,
    originX,
    originY,
    originZ,
    board,
    previousOriginX,
    previousOriginY,
    previousOriginZ
  }))
}

function evaluateMove(x, y, player) {
  const opponent = player === "W" ? "B" : "W";
  let score = 0;

  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (const [dx, dy] of directions) {
    let i = 1;
    let flippable = [];
    let x2 = x + dx,
      y2 = y + dy;

    while (
      x2 >= 0 &&
      x2 < 8 &&
      y2 >= 0 &&
      y2 < 8 &&
      board[y2][x2] === opponent
    ) {
      flippable.push({ x: x2, y: y2 });
      x2 += dx;
      y2 += dy;
      i++;
    }

    if (
      i > 1 &&
      x2 >= 0 &&
      x2 < 8 &&
      y2 >= 0 &&
      y2 < 8 &&
      board[y2][x2] === player
    ) {
      score += flippable.length;
    }
  }

  return score;
}

// Function to clear the previous board
const clearPreviousBoard = () => {
  if (previousOriginX !== null) {
    const overworld = world.getDimension("overworld");
    
    function clearNextBlock(i, j) {
      system.runTimeout(() => {
        const x = previousOriginX + i;
        const y = previousOriginY;
        const z = previousOriginZ + j;
        overworld.runCommand(`setblock ${x} ${y} ${z} air`);

        j++;
        if (j < 8) {
          clearNextBlock(i, j);
        } else {
          j = 0;
          i++;
          if (i < 8) {
            system.runTimeout(() => {
              clearNextBlock(i, j);
            }, 0);
          }
        }
      }, 0);
    }

    clearNextBlock(0, 0);
  }
};

// Modified setup command to use the player's position
world.beforeEvents.chatSend.subscribe((e) => {
  if (e.message === "./setup") {
    e.cancel = true;
    isstart = true;
    isplace = true;
    e.sender.sendMessage("作業台を置いてゲームを開始します。");
  }
});

world.afterEvents.playerPlaceBlock.subscribe((e) => {
  if(e.block.typeId === "minecraft:crafting_table" && isstart) {
    isstart = false;
    const position = e.block.location;
    
    // Clear the previous board first
    clearPreviousBoard();
    
    // Store the origin coordinates
    previousOriginX = originX;
    previousOriginY = originY;
    previousOriginZ = originZ;
    
    // Set new origin coordinates
    originX = Math.floor(position.x);
    originY = Math.floor(position.y); // One block below player
    originZ = Math.floor(position.z);
    
    // Reset the board
    board = [
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "W", "B", "", "", ""],
      ["", "", "", "B", "W", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
    ];

    // Add a small delay before rendering the new board
    system.runTimeout(() => {
      boardrender();
    }, 10);
  }
})

// Modified interaction handler to use relative coordinates
world.afterEvents.playerBreakBlock.subscribe((e) => {
  if (!isplace) return;

  const position = e.block.center();
  const relativeX = Math.floor(position.x) - originX;
  const relativeZ = Math.floor(position.z) - originZ;
  
  // Check if the click is within the board boundaries
  if (relativeX >= 0 && relativeX < 8 && relativeZ >= 0 && relativeZ < 8) {
    if (board[relativeX][relativeZ] === "") {
      isplace = false;
      board[relativeX][relativeZ] = "W";
      flipPieces(relativeZ, relativeX, "W");
      system.runTimeout(() => {
        placeBestBlackPiece();
      }, 20);
    }
  }
});