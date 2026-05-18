let capture;
let handPose;
let hands = [];
let playerGesture = "等待中...";
let computerGesture = "";
let result = "";
let options = ["石頭", "剪刀", "布"];
let lastPlayTime = 0;
let winCount = 0;
let lossCount = 0;
let tieCount = 0;
let gameState = "PLAYING"; // PLAYING, WAITING_FOR_COMMAND, FINISHED
let ghostImg, cheerImg;
let fireworks = [];
let ghostY;
let showCheer = false;

function preload() {
  // 初始化 handPose 模型
  handPose = ml5.handPose();
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
  
  // 繪製手部骨架與關鍵點
  if (hands.length > 0) {
    drawSkeleton(vWidth, vHeight);
  }
  pop();

  // 顯示遊戲資訊
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(24);
  text(`勝: ${winCount}  |  敗: ${lossCount}  |  平手: ${tieCount}`, width / 2, 30);

  if (gameState === "PLAYING") {
    textSize(32);
    text("玩家目前手勢: " + playerGesture, width / 2, y + vHeight + 40);
    
    if (computerGesture) {
      text("電腦出拳: " + computerGesture, width / 2, y + vHeight + 80);
      textSize(48);
      fill(result === "你贏了！" ? "#2a9d8f" : result === "你輸了！" ? "#e76f51" : "#264653");
      text(result, width / 2, y + vHeight + 140);
    }

    // 猜拳自動觸發邏輯
    if (playerGesture !== "未偵測到" && playerGesture !== "判定中..." && !["6", "OK"].includes(playerGesture)) {
      let elapsed = millis() - lastPlayTime;
      if (elapsed > 3000) {
        playGame();
        lastPlayTime = millis();
        gameState = "WAITING_FOR_COMMAND";
      }
      fill(255, 0, 0);
      textSize(48);
      text(ceil((3000 - elapsed) / 1000), width / 2, y - 40);
    } else {
      lastPlayTime = millis();
    }
  } else if (gameState === "WAITING_FOR_COMMAND") {
    fill(0);
    textSize(28);
    text("比出『 6 』繼續遊戲，或是『 OK 』結束遊戲", width / 2, y + vHeight + 180);
    
    if (playerGesture === "6") {
      resetRound();
    } else if (playerGesture === "OK") {
      gameState = "FINISHED";
    }
  } else if (gameState === "FINISHED") {
    handleEndGameEffects();
  }
}

// 煙火特效類別
class Firework {
  constructor(x, y) {
    this.particles = [];
    let col = color(random(255), random(255), random(255));
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y, col));
    }
  }
  update() {
    for (let p of this.particles) p.update();
  }
  show() {
    for (let p of this.particles) p.show();
  }
  done() {
    return this.particles.length > 0 && this.particles[0].lifespan <= 0;
  }
}

class Particle {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 6));
    this.lifespan = 255;
    this.col = col;
  }
  update() {
    this.pos.add(this.vel);
    this.lifespan -= 5;
  }
  show() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan);
    ellipse(this.pos.x, this.pos.y, 5);
  }
}

function resetRound() {
  computerGesture = "";
  result = "";
  gameState = "PLAYING";
  lastPlayTime = millis();
}

function handleEndGameEffects() {
  if (winCount > lossCount) {
    // 放煙火
    if (frameCount % 10 === 0) {
      fireworks.push(new Firework(random(width), random(height / 2)));
    }
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].show();
      if (fireworks[i].done()) fireworks.splice(i, 1);
    }
  } else if (lossCount > winCount) {
    // 幽靈飄出
    imageMode(CENTER);
    image(ghostImg, width / 2, ghostY, 200, 200);
    ghostY -= 3;
    if (ghostY < -200) ghostY = height;
  } else {
    // 加油
    imageMode(CENTER);
    image(cheerImg, width / 2, height / 2, 400, 400);
  }
  
  fill(0);
  textSize(32);
  text("遊戲已結束", width / 2, 100);
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
  
  let isThumbUp = points[4].x < points[3].x; // 簡單判定拇指是否有張開 (鏡像後方向需注意)
  let isIndexUp = points[8].y < points[6].y;
  let isMiddleUp = points[12].y < points[10].y;
  let isRingUp = points[16].y < points[14].y;
  let isPinkyUp = points[20].y < points[18].y;

  // OK手勢判定：拇指尖與食指尖距離很近，且中、無名、小指伸直
  let d = dist(points[4].x, points[4].y, points[8].x, points[8].y);
  if (d < 30 && isMiddleUp && isRingUp && isPinkyUp) {
    return "OK";
  }

  // 數字 6 判定：拇指與小指伸直，其餘握拳
  if (isThumbUp && isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp) {
    return "6";
  }

  // 猜拳邏輯
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return "布";
  } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    return "剪刀";
  } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "石頭";
  }
  return "判定中...";
}

function playGame() {
  if (playerGesture === "石頭" || playerGesture === "剪刀" || playerGesture === "布") {
    computerGesture = random(options);
    
    if (playerGesture === computerGesture) {
      result = "平手！";
      tieCount++;
    } else if (
      (playerGesture === "石頭" && computerGesture === "剪刀") ||
      (playerGesture === "剪刀" && computerGesture === "布") ||
      (playerGesture === "布" && computerGesture === "石頭")
    ) {
      result = "你贏了！";
      winCount++;
    } else {
      result = "你輸了！";
      lossCount++;
    }
  }
}

function drawSkeleton(vWidth, vHeight) {
  let hand = hands[0];
  let points = hand.keypoints;

  // 手部連接定義 (21 個點的索引關係)
  let connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // 大拇指
    [0, 5], [5, 6], [6, 7], [7, 8],       // 食指
    [0, 9], [9, 10], [10, 11], [11, 12],  // 中指
    [0, 13], [13, 14], [14, 15], [15, 16],// 無名指
    [0, 17], [17, 18], [18, 19], [19, 20],// 小指
    [5, 9], [9, 13], [13, 17], [0, 17]    // 掌心基部
  ];

  // 1. 先畫骨架線條
  stroke(255, 0, 0);
  strokeWeight(2);
  for (let i = 0; i < connections.length; i++) {
    let p1 = points[connections[i][0]];
    let p2 = points[connections[i][1]];
    let x1 = map(p1.x, 0, capture.width, 0, vWidth);
    let y1 = map(p1.y, 0, capture.height, 0, vHeight);
    let x2 = map(p2.x, 0, capture.width, 0, vWidth);
    let y2 = map(p2.y, 0, capture.height, 0, vHeight);
    line(x1, y1, x2, y2);
  }

  // 2. 再畫關鍵點
  fill(255, 255, 0);
  noStroke();
  for (let i = 0; i < hand.keypoints.length; i++) {
    let keypoint = hand.keypoints[i];
    let kx = map(keypoint.x, 0, capture.width, 0, vWidth);
    let ky = map(keypoint.y, 0, capture.height, 0, vHeight);
    ellipse(kx, ky, 8, 8);
  }
}
