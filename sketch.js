let capture;
let handPose;
let hands = [];
let playerGesture = "未偵測到";
let computerGesture = "";
let roundResult = "";
let options = ["石頭", "剪刀", "布"];
let lastPlayTime = 0;

// 遊戲統計與狀態
let winCount = 0;
let lossCount = 0;
let tieCount = 0;
let gameState = "PLAYING"; // PLAYING, ROUND_END, FINISHED

// 特效相關
let cheerImg;
let fireworks = [];
let ghosts = [];

function preload() {
  // 初始化 handPose 模型
  handPose = ml5.handPose({ flipped: true }); // 使用 flipped 確保座標與鏡像一致
  cheerImg = loadImage('picture/加油.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.hide(); // 隱藏預設的攝影機 HTML 元素
  handPose.detectStart(capture, gotHands); // 開始偵測手部
}

function draw() {
  background('#bde0fe');

  let vWidth = width * 0.5;
  let vHeight = height * 0.5;
  let x = (width - vWidth) / 2;
  let y = (height - vHeight) / 2;

  push();
  translate(x + vWidth, y); // 移動到顯示區域的右側邊界
  scale(-1, 1);            // 水平翻轉
  image(capture, 0, 0, vWidth, vHeight);
  
  // 繪製手部骨架
  if (hands.length > 0 && gameState !== "FINISHED") {
    drawHandSkeleton(vWidth, vHeight);
  }
  pop();

  // 1. 顯示計分板
  drawScoreBoard(y);

  // 2. 處理遊戲邏輯
  if (gameState === "FINISHED") {
    displayEndGameEffects();
  } else {
    displayGameInfo(y, vHeight);
    handleAutoPlay();
  }

  // 偵測特殊控制手勢
  checkControlGestures();
}

function drawScoreBoard(y) {
  textAlign(CENTER, CENTER);
  textSize(28);
  fill(50);
  noStroke();
  text(`勝: ${winCount}  |  敗: ${lossCount}  |  平手: ${tieCount}`, width / 2, y - 40);
}

function displayGameInfo(y, vHeight) {
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0);
  text("玩家手勢: " + playerGesture, width / 2, y + vHeight + 40);
  
  if (computerGesture) {
    text("電腦出拳: " + computerGesture, width / 2, y + vHeight + 80);
    textSize(48);
    // 修正變數名稱從 result 改為 roundResult
    let c = roundResult === "你贏了！" ? "#2a9d8f" : roundResult === "你輸了！" ? "#e76f51" : "#264653";
    fill(c);
    text(roundResult, width / 2, y + vHeight + 140);
  }
}

function handleAutoPlay() {
  // 只有在出拳手勢（剪刀石頭布）且遊戲進行中才自動觸發
  let validGestures = ["石頭", "剪刀", "布"];
  if (gameState === "PLAYING" && validGestures.includes(playerGesture)) {
    if (millis() - lastPlayTime > 3000) {
      playGame();
      lastPlayTime = millis();
      gameState = "ROUND_END"; 
    }
  }
}

function checkControlGestures() {
  if (playerGesture === "讚" && (gameState === "ROUND_END" || gameState === "FINISHED")) {
    if (gameState === "FINISHED") {
      winCount = 0; lossCount = 0; tieCount = 0;
      fireworks = []; ghosts = [];
    }
    gameState = "PLAYING";
    computerGesture = "";
    roundResult = "請出拳...";
  } else if (playerGesture === "OK" && gameState !== "FINISHED") {
    gameState = "FINISHED";
  }
}

function displayEndGameEffects() {
  if (winCount > lossCount) {
    if (random(1) < 0.1) fireworks.push(new Firework(random(width), height));
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].show();
      if (fireworks[i].done()) fireworks.splice(i, 1);
    }
    fill("#2a9d8f");
    textSize(64);
    text("大獲全勝！", width / 2, height / 2);
  } else if (lossCount > winCount) {
    if (frameCount % 60 === 0) ghosts.push(new Ghost(random(width), height + 50));
    for (let i = ghosts.length - 1; i >= 0; i--) {
      ghosts[i].update();
      ghosts[i].show();
      if (ghosts[i].y < -50) ghosts.splice(i, 1);
    }
    fill("#e76f51");
    textSize(64);
    text("再接再厲...", width / 2, height / 2);
  } else {
    imageMode(CENTER);
    image(cheerImg, width / 2, height / 2, 300, 300);
    imageMode(CORNER);
    fill("#264653");
    textSize(64);
    text("勢均力敵！", width / 2, height / 2 + 200);
  }
  
  textSize(24);
  fill(0);
  text("比出 👍 重新開始遊戲", width / 2, height - 50);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotHands(results) {
  hands = results;
  if (hands.length > 0) {
    playerGesture = analyzeGesture(hands[0]);
  } else {
    playerGesture = "未偵測到";
  }
}

function analyzeGesture(hand) {
  let points = hand.keypoints;
  
  // 檢查手指是否伸直
  let isIndexUp = points[8].y < points[6].y;
  let isMiddleUp = points[12].y < points[10].y;
  let isRingUp = points[16].y < points[14].y;
  let isPinkyUp = points[20].y < points[18].y;
  let isThumbUp = points[4].y < points[3].y && points[4].y < points[17].y;

  // OK 手勢判定：食指尖與拇指尖靠近，且其他三指伸直
  let okDist = dist(points[8].x, points[8].y, points[4].x, points[4].y);
  if (okDist < 40 && isMiddleUp && isRingUp && isPinkyUp) {
    return "OK";
  }

  // 讚手勢判定：拇指向上，其他手指握拳
  if (isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "讚";
  }

  // 猜拳判定
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return "布";
  } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    return "剪刀";
  } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "石頭";
  }
  return "未知";
}

function playGame() {
  computerGesture = random(options);
  
  if (playerGesture === computerGesture) {
    roundResult = "平手！";
    tieCount++;
  } else if (
    (playerGesture === "石頭" && computerGesture === "剪刀") ||
    (playerGesture === "剪刀" && computerGesture === "布") ||
    (playerGesture === "布" && computerGesture === "石頭")
  ) {
    roundResult = "你贏了！";
    winCount++;
  } else {
    roundResult = "你輸了！";
    lossCount++;
  }
}

function drawHandSkeleton(vWidth, vHeight) {
  let hand = hands[0];
  let points = hand.keypoints;

  // 畫骨架連接線
  stroke(255, 255, 0);
  strokeWeight(3);
  
  // 定義手指連接結構
  let skeleton = [
    [0, 1, 2, 3, 4],    // 拇指
    [0, 5, 6, 7, 8],    // 食指
    [9, 10, 11, 12],   // 中指
    [13, 14, 15, 16],  // 無名指
    [17, 18, 19, 20],  // 小指
    [5, 9, 13, 17, 0]  // 手掌底
  ];

  for (let segment of skeleton) {
    for (let i = 0; i < segment.length - 1; i++) {
      let p1 = points[segment[i]];
      let p2 = points[segment[i+1]];
      line(
        map(p1.x, 0, capture.width, 0, vWidth), map(p1.y, 0, capture.height, 0, vHeight),
        map(p2.x, 0, capture.width, 0, vWidth), map(p2.y, 0, capture.height, 0, vHeight)
      );
    }
  }

  // 畫關節點
  noStroke();
  fill(255, 0, 0);
  for (let kp of points) {
    ellipse(map(kp.x, 0, capture.width, 0, vWidth), map(kp.y, 0, capture.height, 0, vHeight), 8, 8);
  }
}

// --- 特效類別 ---

class Firework {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-2, 2), random(-12, -8));
    this.particles = [];
    this.exploded = false;
  }
  update() {
    if (!this.exploded) {
      this.pos.add(this.vel);
      this.vel.y += 0.2; // 重力
      if (this.vel.y >= 0) {
        this.exploded = true;
        for (let i = 0; i < 50; i++) this.particles.push(new Particle(this.pos.x, this.pos.y));
      }
    }
    for (let p of this.particles) p.update();
  }
  show() {
    if (!this.exploded) {
      stroke(255);
      point(this.pos.x, this.pos.y);
    }
    for (let p of this.particles) p.show();
  }
  done() { return this.exploded && this.particles.length === 0; }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 6));
    this.acc = createVector(0, 0.1);
    this.life = 255;
  }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.life -= 4;
  }
  show() {
    stroke(random(255), random(255), random(255), this.life);
    strokeWeight(4);
    point(this.pos.x, this.pos.y);
  }
}

class Ghost {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.speed = random(2, 4);
  }
  update() { this.y -= this.speed; }
  show() {
    fill(255, 200);
    noStroke();
    ellipse(this.x, this.y, 40, 60);
    fill(0);
    ellipse(this.x - 10, this.y - 10, 5, 5);
    ellipse(this.x + 10, this.y - 10, 5, 5);
  }
}
