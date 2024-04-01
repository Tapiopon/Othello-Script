import { world, system } from "@minecraft/server";

let isplace = true;

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

const boardrender = () => {
  const overworld = world.getDimension("overworld");

  function runNextIteration(i, j) {
    system.runTimeout(() => {
      const x = i;
      const y = -60;
      const z = j;
      if (board[i][j] === "")
        overworld.runCommand(`setblock ${x} ${y} ${z} green_wool`);
      if (board[i][j] === "W")
        overworld.runCommand(`setblock ${x} ${y} ${z} white_wool`);
      if (board[i][j] === "B")
        overworld.runCommand(`setblock ${x} ${y} ${z} black_wool`);

      // Increment j and check if it exceeds the length of board[i]
      j++;
      if (j < board[i].length) {
        // If j is within bounds, call runNextIteration with updated i and j
        runNextIteration(i, j);
      } else {
        // If j exceeds the length, reset j to 0 and increment i
        j = 0;
        i++;

        // Check if i exceeds the length of board
        if (i < board.length) {
          // If i is within bounds, call runNextIteration with updated i and j after 1 second
          system.runTimeout(() => {
            runNextIteration(i, j);
          }, 0);
        }
      }
    }, 0);
  }

  // Start the loop with initial values of i and j as 0
  runNextIteration(0, 0);
};

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

world.afterEvents.chatSend.subscribe((e) => {
  if (e.message == "./setup") {
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
    boardrender();
  }
});

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
  if (!isplace) return;

  const position = e.block.center();
  const x = Math.floor(position.x);
  const z = Math.floor(position.z);
  if (board[x][z] == "") {
    isplace = false;
    board[x][z] = "W";
    flipPieces(z, x, "W");
    system.runTimeout(() => {
      placeBestBlackPiece();
    }, 20);
  }
});
