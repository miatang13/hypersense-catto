const EXPRESSION_RECOGNITION = false;
const IMAGE_H = 216;
const IMAGE_W = 384;

let faceapi;
let detections = [];

let video;
let canvas;

// Play corresponding cat gif
let mappingJson;

// keep track of state to play corresponding gif
let prevState = "sit"; // default
let curState = prevState;
let curGif;

// gifs for states
let sitGif, walkGif;
let sitToWalkGif;

// move where we draw the gif if we are walking
let gifPos;
let gifPosStart;
let gifPosDest;
let gifWraps;
const STEP = 0.00001;
let lerpAmt = 1;

// transition times
const SIT_TO_WALK_DUR = 400;

function stateToGif(state) {
  switch (state) {
    case "sit":
      return sitGif;
    case "walk":
      return walkGif;
    default:
      console.log("Invalid state");
      return;
  }
}

function preload() {
  mappingJson = loadJSON("emotionMapResponse.json");
  sitGif = loadGif("gifs/sitting.gif");
  walkGif = loadGif("gifs/walk.gif");
  sitToWalkGif = loadGif("gifs/sitToWalk.gif");
  curGif = stateToGif(curState);
}

function setup() {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  canvas.id("canvas");

  if (EXPRESSION_RECOGNITION) {
    setupFacialRecognition();
  }

  const randX = random(0, width - IMAGE_W);
  gifPos = createVector(width / 4, height - IMAGE_H);
  gifPosDest = gifPos;

  // For testing
  button = createButton("Switch to walk");
  button.mousePressed(switchToWalk);

  console.log("Width:", width);
}

function updateState() {
  switch (curState) {
    case "walk":
      if (lerpAmt >= 1) {
        curState = "sit";
        curGif = sitGif;
        console.log("Finished walking, switching to sit");
      }
      return;
    default:
      return;
  }
}

function switchToWalk() {
  console.log("Switching to walk");

  if (curState === "sit") {
    curGif = sitToWalkGif;
    setTimeout(() => {
      console.log("Finished playing sit to walk transition");
      prevState = curState;
      curState = "walk";
      lerpAmt = 0;
      curGif = walkGif;
      gifPosStart = gifPos;
      const randX = random(-width / 2, width / 2);
      gifPosDest = createVector(Math.floor(gifPos.x + randX), height - IMAGE_H);
      if (gifPosDest.x <= gifPos.x) {
        gifPosDest.x += width;
        gifWraps = true;
      }
      gifPrevPos = gifPosStart;
    }, SIT_TO_WALK_DUR);
  }
}

function switchToSit() {
  console.log("Switching to sit");
  curState = "sit";
  curGif = sitGif;
  gifPosDest = gifPos;
}

function draw() {
  // Draw gif
  background(206);

  updateState();

  let x = gifPosDest.x;
  if (Math.ceil(gifPos.x) < Math.floor(gifPosDest.x)) {
    // currently walking
    console.log("pos", gifPos.x, "dest", gifPosDest.x);
    if (curState === "walk" && lerpAmt < 1) {
      x = Math.ceil((1 - lerpAmt) * gifPosStart.x + lerpAmt * gifPosDest.x);
      console.log("lerp", lerpAmt, "x", x);
      lerpAmt += STEP;
    }
  } else if (curState === "walk") {
    // turn off walk mode
    gifPos.x %= width;
    switchToSit();
    x = gifPos.x;
  }

  image(curGif, x % width, height - IMAGE_H);
  gifPos.x = x;
  gifPrevPos = gifPos;
}

/************** EMOTION RECOGNITION  ***************/
// facial detection code from:
// https://github.com/Creativeguru97/YouTube_tutorial/tree/master/Play_with_APIs/ml5_faceApi/face-api_videoInput/final
function setupFacialRecognition() {
  video = createCapture(VIDEO); // Create the video: ビデオオブジェクトを作る
  video.id("video");
  video.size(width / 2, height / 2);

  const faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  //Initialize the model: モデルの初期化
  faceapi = ml5.faceApi(video, faceOptions, faceReady);
}

function faceReady() {
  faceapi.detect(gotFaces); // Start detecting faces: 顔認識開始
}

// Got faces: 顔を検知
function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }

  detections = result; //Now all the data in this detections: 全ての検知されたデータがこのdetectionの中に
  // console.log(detections);

  clear(); //Draw transparent background;: 透明の背景を描く
  drawBoxs(detections); //Draw detection box: 顔の周りの四角の描画
  drawLandmarks(detections); //// Draw all the face points: 全ての顔のポイントの描画
  drawExpressions(detections, 20, 250, 14); //Draw face expression: 表情の描画

  faceapi.detect(gotFaces); // Call the function again at here: 認識実行の関数をここでまた呼び出す
}

function drawBoxs(detections) {
  if (detections.length > 0) {
    //If at least 1 face is detected: もし1つ以上の顔が検知されていたら
    for (f = 0; f < detections.length; f++) {
      let { _x, _y, _width, _height } = detections[f].alignedRect._box;
      stroke(44, 169, 225);
      strokeWeight(1);
      noFill();
      rect(_x, _y, _width, _height);
    }
  }
}

function drawLandmarks(detections) {
  if (detections.length > 0) {
    //If at least 1 face is detected: もし1つ以上の顔が検知されていたら
    for (f = 0; f < detections.length; f++) {
      let points = detections[f].landmarks.positions;
      for (let i = 0; i < points.length; i++) {
        stroke(44, 169, 225);
        strokeWeight(3);
        point(points[i]._x, points[i]._y);
      }
    }
  }
}

function drawExpressions(detections, x, y, textYSpace) {
  if (detections.length > 0) {
    //If at least 1 face is detected: もし1つ以上の顔が検知されていたら
    let { neutral, happy, angry, sad, disgusted, surprised, fearful } =
      detections[0].expressions;
    textFont("Helvetica Neue");
    textSize(14);
    noStroke();
    fill(44, 169, 225);

    text("neutral:       " + nf(neutral * 100, 2, 2) + "%", x, y);
    text("happiness: " + nf(happy * 100, 2, 2) + "%", x, y + textYSpace);
    text("anger:        " + nf(angry * 100, 2, 2) + "%", x, y + textYSpace * 2);
    text("sad:            " + nf(sad * 100, 2, 2) + "%", x, y + textYSpace * 3);
    text(
      "disgusted: " + nf(disgusted * 100, 2, 2) + "%",
      x,
      y + textYSpace * 4
    );
    text(
      "surprised:  " + nf(surprised * 100, 2, 2) + "%",
      x,
      y + textYSpace * 5
    );
    text(
      "fear:           " + nf(fearful * 100, 2, 2) + "%",
      x,
      y + textYSpace * 6
    );
  } else {
    //If no faces is detected: 顔が1つも検知されていなかったら
    text("neutral: ", x, y);
    text("happiness: ", x, y + textYSpace);
    text("anger: ", x, y + textYSpace * 2);
    text("sad: ", x, y + textYSpace * 3);
    text("disgusted: ", x, y + textYSpace * 4);
    text("surprised: ", x, y + textYSpace * 5);
    text("fear: ", x, y + textYSpace * 6);
  }
}
