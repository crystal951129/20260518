let capture;
let handPose;
let hands = [];
let playerGesture = "等待中...";
let computerGesture = "";
let result = "";
let options = ["石頭", "剪刀", "布"];
let lastPlayTime = 0;
let lastSeenTime = 0;
let winCount = 0;
let lossCount = 0;
let drawCount = 0;
let gameEnded = false;
let ghostImg, cheerImg;
let fireworks = [];
let ghostY;

function preload() {
  // 初始化 handPose 模型
  handPose = ml5.handPose();
  // 載入結束畫面需要的圖片
  ghostImg = loadImage('picture/幽靈.png');
  cheerImg = loadImage('picture/加油.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.hide(); // 隱藏預設的攝影機 HTML 元素
  handPose.detectStart(capture, gotHands); // 開始偵測手部
  lastSeenTime = millis();
  ghostY = height;
}

function draw() {
  background('#bde0fe');

  if (gameEnded) {
    showEndScreen();
    return;
  }

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
  textSize(32);
  fill(0);
  
  // 顯示戰績
  text(`勝: ${winCount} | 敗: ${lossCount} | 平手: ${drawCount}`, width / 2, 40);
  
  text("玩家手勢: " + playerGesture, width / 2, y + vHeight + 40);
  
  if (computerGesture) {
    text("電腦出拳: " + computerGesture, width / 2, y + vHeight + 80);
    textSize(48);
    fill(result === "你贏了！" ? "#2a9d8f" : result === "你輸了！" ? "#e76f51" : "#264653");
    text(result, width / 2, y + vHeight + 140);
  }

  // 檢查是否手勢為 OK，若是則結束
  if (playerGesture === "OK") {
    gameEnded = true;
  }

  // 自動結束邏輯：超過 10 秒沒看到手
  if (millis() - lastSeenTime > 10000) {
    gameEnded = true;
  }

  // 正常遊戲倒數邏輯
  if (playerGesture !== "未偵測到" && playerGesture !== "判定中..." && playerGesture !== "OK") {
    let elapsed = millis() - lastPlayTime;
    if (elapsed > 3000) {
      playGame();
      lastPlayTime = millis();
    }
    
    // 顯示倒數計時（視覺輔助）
    fill(255, 0, 0);
    textSize(48);
    text(ceil((3000 - elapsed) / 1000), width / 2, y - 40);
  } else {
    // 如果手部消失，重置計時器，直到下次偵測到手才重新開始 3 秒倒數
    lastPlayTime = millis();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function gotHands(results) {
  hands = results;
  if (hands.length > 0) {
    playerGesture = analyzeGesture(hands[0]);
    lastSeenTime = millis(); // 更新最後看到手的時間
  } else {
    playerGesture = "未偵測到";
  }
}

function analyzeGesture(hand) {
  // 取得關鍵點位置 (ml5.js v1 使用 keypoints 陣列)
  // 8: 食指尖, 6: 食指第二關節
  // 12: 中指尖, 10: 中指第二關節
  // 16: 無名指尖, 14: 無名指第二關節
  // 20: 小指尖, 18: 小指第二關節
  let points = hand.keypoints;
  
  let isIndexUp = points[8].y < points[6].y;
  let isMiddleUp = points[12].y < points[10].y;
  let isRingUp = points[16].y < points[14].y;
  let isPinkyUp = points[20].y < points[18].y;
  let isThumbUp = points[4].y < points[2].y;

  // 偵測 OK 手勢 (食指尖 8 與 大拇指尖 4 碰觸，且其他手指伸直)
  let d = dist(points[8].x, points[8].y, points[4].x, points[4].y);
  if (d < 30 && isMiddleUp && isRingUp && isPinkyUp) {
    return "OK";
  }

  // 簡易判定邏輯
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
      drawCount++;
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

function showEndScreen() {
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(64);
  text("遊戲結束", width / 2, height / 2 - 100);
  textSize(32);
  text(`最終戰績 - 勝: ${winCount} 敗: ${lossCount} 平手: ${drawCount}`, width / 2, height / 2 - 30);

  if (winCount > lossCount) {
    // 勝利：煙火特效
    spawnFireworks();
  } else if (winCount < lossCount) {
    // 失敗：幽靈飄出
    imageMode(CENTER);
    image(ghostImg, width / 2, ghostY, 200, 200);
    ghostY -= 2;
    if (ghostY < -100) ghostY = height;
  } else {
    // 平手：加油
    imageMode(CENTER);
    let scaleFactor = sin(frameCount * 0.1) * 0.1 + 1.0;
    push();
    translate(width / 2, height / 2 + 100);
    scale(scaleFactor);
    image(cheerImg, 0, 0, 200, 200);
    pop();
  }
}

function spawnFireworks() {
  if (frameCount % 10 === 0) {
    fireworks.push(new Firework(random(width), height));
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].display();
    if (fireworks[i].done()) fireworks.splice(i, 1);
  }
}

class Firework {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vel = random(-12, -8);
    this.particles = [];
    this.exploded = false;
    this.c = color(random(255), random(255), random(255));
  }
  update() {
    if (!this.exploded) {
      this.y += this.vel;
      this.vel += 0.2;
      if (this.vel >= 0) {
        this.exploded = true;
        for (let i = 0; i < 50; i++) this.particles.push(createVector(this.x, this.y));
      }
    }
  }
  display() {
    fill(this.c);
    if (!this.exploded) {
      ellipse(this.x, this.y, 10, 10);
    } else {
      for (let p of this.particles) {
        p.x += random(-5, 5);
        p.y += random(-5, 5);
        ellipse(p.x, p.y, 4, 4);
      }
    }
  }
  done() { return this.exploded && this.y > height; }
}
