let capture;
let handPose;
let hands = [];
let playerGesture = "等待中...";
let computerGesture = "";
let result = "";
let options = ["石頭", "剪刀", "布"];
let lastPlayTime = 0;

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
  
  // 繪製手部關鍵點（可選，增加視覺效果）
  if (hands.length > 0) {
    drawKeypoints(vWidth, vHeight);
  }
  pop();

  // 顯示遊戲資訊
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0);
  text("玩家手勢: " + playerGesture, width / 2, y + vHeight + 40);
  
  if (computerGesture) {
    text("電腦出拳: " + computerGesture, width / 2, y + vHeight + 80);
    textSize(48);
    fill(result === "你贏了！" ? "#2a9d8f" : result === "你輸了！" ? "#e76f51" : "#264653");
    text(result, width / 2, y + vHeight + 140);
  }

  // 簡單的遊戲自動觸發邏輯：每隔 3 秒更新一次電腦選擇
  if (millis() - lastPlayTime > 3000 && playerGesture !== "未偵測到") {
    playGame();
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
    } else if (
      (playerGesture === "石頭" && computerGesture === "剪刀") ||
      (playerGesture === "剪刀" && computerGesture === "布") ||
      (playerGesture === "布" && computerGesture === "石頭")
    ) {
      result = "你贏了！";
    } else {
      result = "你輸了！";
    }
  }
}

function drawKeypoints(vWidth, vHeight) {
  // 在縮放後的畫布上繪製手部節點
  let hand = hands[0];
  fill(255, 0, 0);
  noStroke();
  for (let i = 0; i < hand.keypoints.length; i++) {
    let keypoint = hand.keypoints[i];
    // 將原始影像座標映射到畫布上的 50% 大小
    let kx = map(keypoint.x, 0, capture.width, 0, vWidth);
    let ky = map(keypoint.y, 0, capture.height, 0, vHeight);
    ellipse(kx, ky, 8, 8);
  }
}
