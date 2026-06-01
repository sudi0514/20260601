// Heart Shooter Game - p5.js Version
// 一個 VSCode 風格的射擊遊戲

// ===== 全局變數 =====
let gameState = 'idle'; // idle, playing, gameOver
let score = 0;
let highScore = localStorage.getItem('heartShooterHighScore') || 0;
let timeLeft = 60;
let frameCounter = 0;

// 遊戲物件陣列
let hearts = [];
let bullets = [];
let particles = [];

// 箭頭位置和旋轉角度
let arrowX, arrowY;
let arrowAngle = 0;

// 遊戲常數
const ARROW_SPEED = 8;
const HEART_SPAWN_RATE = 25;
const HEART_RADIUS = 20;
const BULLET_RADIUS = 4;
const PARTICLE_COUNT = 12;
const PARTICLE_SPEED = 5;

// ===== 類別定義 =====

/**
 * 愛心物件類別
 */
class Heart {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.radius = HEART_RADIUS;
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 邊界反彈
    if (this.x - this.radius < 0 || this.x + this.radius > width) {
      this.vx *= -1;
      this.x = constrain(this.x, this.radius, width - this.radius);
    }
    if (this.y - this.radius < 0 || this.y + this.radius > height) {
      this.vy *= -1;
      this.y = constrain(this.y, this.radius, height - this.radius);
    }
  }

  display() {
    push();
    translate(this.x, this.y);

    // 繪製愛心形狀
    fill('#ff6b6b');
    stroke('#ff0000');
    strokeWeight(2);

    // 愛心路徑
    beginShape();
    for (let i = 0; i < TWO_PI; i += 0.1) {
      let r = this.radius * (13 * cos(i) - 5 * cos(2 * i) - 2 * cos(3 * i) - cos(4 * i)) / 16;
      let px = r * cos(i);
      let py = -r * sin(i);
      vertex(px, py);
    }
    endShape(CLOSE);

    // 繪製眼睛
    fill('#ffffff');
    noStroke();
    circle(-8, -5, 6);
    circle(8, -5, 6);

    // 繪製瞳孔
    fill('#000000');
    circle(-8, -5, 3);
    circle(8, -5, 3);

    pop();
  }

  isHit(bx, by, br) {
    let d = dist(this.x, this.y, bx, by);
    return d < this.radius + br;
  }
}

/**
 * 子彈物件類別
 */
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.vx = cos(angle) * ARROW_SPEED;
    this.vy = sin(angle) * ARROW_SPEED;
    this.radius = BULLET_RADIUS;
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    // 超出螢幕時刪除
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.alive = false;
    }
  }

  display() {
    fill('#00d9ff');
    noStroke();
    circle(this.x, this.y, this.radius * 2);
  }
}

/**
 * 粒子物件類別
 */
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-PARTICLE_SPEED, PARTICLE_SPEED);
    this.vy = random(-PARTICLE_SPEED, PARTICLE_SPEED);
    this.life = 50;
    this.maxLife = 50;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.2; // 重力
    this.life--;
  }

  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    fill(255, 107, 107, alpha);
    noStroke();
    circle(this.x, this.y, 4);
  }
}

// ===== p5.js 主函數 =====

function setup() {
  createCanvas(windowWidth, windowHeight);
  arrowX = width / 2;
  arrowY = height / 2;
}

function draw() {
  // 背景
  background('#2d2d30');
  drawGrid();

  // 遊戲邏輯
  if (gameState === 'idle') {
    drawIdleScreen();
  } else if (gameState === 'playing') {
    updateGame();
    checkCollisions();
    drawGame();
  } else if (gameState === 'gameOver') {
    drawGameOverScreen();
  }

  // 繪製 UI
  drawUI();
}

// ===== 遊戲邏輯函數 =====

/**
 * 更新遊戲狀態
 */
function updateGame() {
  frameCounter++;

  // 生成新愛心
  if (frameCounter % HEART_SPAWN_RATE === 0) {
    hearts.push(new Heart(random(50, width - 50), random(50, height - 50)));
  }

  // 更新愛心
  for (let heart of hearts) {
    heart.update();
  }

  // 更新子彈
  for (let bullet of bullets) {
    bullet.update();
  }

  // 更新粒子
  for (let particle of particles) {
    particle.update();
  }

  // 刪除已死亡的物件
  hearts = hearts.filter(h => h.alive);
  bullets = bullets.filter(b => b.alive);
  particles = particles.filter(p => p.life > 0);

  // 更新計時器
  if (frameRate() > 0) {
    timeLeft = max(0, 60 - floor(frameCounter / 60));
  }

  // 遊戲結束
  if (timeLeft <= 0) {
    gameState = 'gameOver';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('heartShooterHighScore', highScore);
    }
  }
}

/**
 * 碰撞檢測
 */
function checkCollisions() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = hearts.length - 1; j >= 0; j--) {
      if (hearts[j].isHit(bullets[i].x, bullets[i].y, bullets[i].radius)) {
        // 擊中！
        hearts[j].alive = false;
        bullets[i].alive = false;
        score += 10;

        // 建立爆炸效果
        createExplosion(hearts[j].x, hearts[j].y);
      }
    }
  }
}

/**
 * 建立粒子爆炸效果
 */
function createExplosion(x, y) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle(x, y));
  }
}

// ===== 渲染函數 =====

/**
 * 繪製網格背景
 */
function drawGrid() {
  stroke('#3e3e42');
  strokeWeight(1);

  // 垂直線
  for (let x = 0; x < width; x += 40) {
    line(x, 0, x, height);
  }

  // 水平線
  for (let y = 0; y < height; y += 40) {
    line(0, y, width, y);
  }
}

/**
 * 繪製遊戲畫面
 */
function drawGame() {
  // 繪製愛心
  for (let heart of hearts) {
    heart.display();
  }

  // 繪製子彈
  for (let bullet of bullets) {
    bullet.display();
  }

  // 繪製粒子
  for (let particle of particles) {
    particle.display();
  }

  // 繪製箭頭
  drawArrow();
}

/**
 * 繪製箭頭
 */
function drawArrow() {
  push();
  translate(arrowX, arrowY);
  rotate(arrowAngle);

  // 箭頭主體
  stroke('#00d9ff');
  strokeWeight(3);
  fill('#00d9ff');

  // 箭頭頭部
  triangle(15, 0, -5, -8, -5, 8);

  // 箭頭尾部
  line(-5, -8, -15, -8);
  line(-5, 8, -15, 8);
  line(-15, -8, -15, 8);

  pop();
}

/**
 * 繪製 UI（得分和計時器）
 */
function drawUI() {
  fill('#ffffff');
  textAlign(LEFT);
  textSize(20);
  textFont('Courier New');

  // 得分
  text('Score: ' + score, 20, 40);

  // 計時器
  textAlign(RIGHT);
  if (gameState === 'playing') {
    text('Time: ' + timeLeft + 's', width - 20, 40);
  }
}

/**
 * 繪製閒置畫面
 */
function drawIdleScreen() {
  fill('#ffffff');
  textAlign(CENTER);
  textSize(60);
  textFont('Courier New');
  text('Heart Shooter', width / 2, height / 2 - 100);

  textSize(24);
  text('Click or press SPACE to start', width / 2, height / 2 + 50);
  text('Move mouse to aim, click to shoot', width / 2, height / 2 + 100);
  text('High Score: ' + highScore, width / 2, height / 2 + 150);
}

/**
 * 繪製遊戲結束畫面
 */
function drawGameOverScreen() {
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);

  fill('#ffffff');
  textAlign(CENTER);
  textSize(60);
  textFont('Courier New');
  text('Game Over', width / 2, height / 2 - 100);

  textSize(40);
  text('Score: ' + score, width / 2, height / 2);

  if (score > highScore) {
    fill('#ffff00');
    text('New High Score!', width / 2, height / 2 + 80);
  } else {
    fill('#ffffff');
    text('High Score: ' + highScore, width / 2, height / 2 + 80);
  }

  textSize(24);
  fill('#ffffff');
  text('Click or press SPACE to restart', width / 2, height / 2 + 150);
}

// ===== 事件處理 =====

/**
 * 滑鼠移動事件 - 控制箭頭方向
 */
function mouseMoved() {
  if (gameState === 'playing') {
    let dx = mouseX - arrowX;
    let dy = mouseY - arrowY;
    arrowAngle = atan2(dy, dx);
  }
  return false;
}

/**
 * 滑鼠點擊事件 - 發射子彈
 */
function mousePressed() {
  if (gameState === 'idle') {
    startGame();
  } else if (gameState === 'playing') {
    shootBullet();
  } else if (gameState === 'gameOver') {
    restartGame();
  }
  return false;
}

/**
 * 鍵盤按下事件
 */
function keyPressed() {
  if (key === ' ') {
    if (gameState === 'idle') {
      startGame();
    } else if (gameState === 'playing') {
      shootBullet();
    } else if (gameState === 'gameOver') {
      restartGame();
    }
    return false;
  }
}

// ===== 遊戲控制函數 =====

/**
 * 開始遊戲
 */
function startGame() {
  gameState = 'playing';
  score = 0;
  timeLeft = 60;
  frameCounter = 0;
  hearts = [];
  bullets = [];
  particles = [];
}

/**
 * 重新開始遊戲
 */
function restartGame() {
  gameState = 'idle';
  score = 0;
  timeLeft = 60;
  frameCounter = 0;
  hearts = [];
  bullets = [];
  particles = [];
}

/**
 * 發射子彈
 */
function shootBullet() {
  bullets.push(new Bullet(arrowX, arrowY, arrowAngle));
}

/**
 * 視窗大小改變事件
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  arrowX = width / 2;
  arrowY = height / 2;
}
