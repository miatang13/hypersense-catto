const EXPRESSION_RECOGNITION = false;
const IMAGE_H = 216;
const IMAGE_W = 384;

// transition times
const TRANSITION_DUR = 1333;
const STRETCH_DUR = 1000;

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
let sitGif, walkGif, stretchGif;
let fromSitGif, ToSitGif;

// sequences for non-loop states
let stretchSequence = [];
let fromSitSequence = [];
let toSitSequence = [];
const STRETCH_SEQUENCE_LEN = 98; // inclusive
const FROM_SIT_SEQUENCE_LEN = 32;
const TO_SIT_SEQUENCE_LEN = 41;
let sequenceIdx = 0;
let sequenceMax;
let sequence;
const FRAME_RATE = 4; // 60 times per second
const SEQUENCE_DELAY = 0.04;
let isSequence = false;
let toSit, fromSit;

// move where we draw the gif if we are walking
let gifPos;
let gifPosStart;
let gifPosDest;
let gifWraps;
const STEP = 0.00001;
let lerpAmt = 1;

// we queue up animations to play
let AnimationQueue = [];

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
  stretchGif = loadGif("gifs/stretch.gif");
  fromSitGif = loadGif("gifs/TransitFromSit.gif");
  ToSitGif = loadGif("gifs/TransitToSit.gif");
  curGif = stateToGif(curState);

  // load sequence
  for (let i = 0; i <= STRETCH_SEQUENCE_LEN; i++) {
    let img = loadImage("gifs/sequence/stretch/" + i.toString() + ".png");
    stretchSequence.push(img);
  }

  for (let i = 0; i <= FROM_SIT_SEQUENCE_LEN; i++) {
    let img = loadImage(
      "gifs/sequence/TransitFromSit/" + i.toString() + ".png"
    );
    fromSitSequence.push(img);
  }

  for (let i = 0; i <= TO_SIT_SEQUENCE_LEN; i++) {
    let img = loadImage("gifs/sequence/TransitToSit/" + i.toString() + ".png");
    toSitSequence.push(img);
  }
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
  button.mousePressed(() => addToQueue("walk"));

  button1 = createButton("Switch to stretch");
  button1.mousePressed(() => addToQueue("stretch"));

  console.log("Width:", width);
}

function addToQueue(stateToAdd) {
  if (stateToAdd === "sit") {
    AnimationQueue.push("toSit");
    AnimationQueue.push("sit");
  } else {
    // all active states must return back to sit
    AnimationQueue.push("fromSit");
    AnimationQueue.push(stateToAdd);
    AnimationQueue.push("toSit");
    AnimationQueue.push("sit");
  }
  console.log("Pushed ", stateToAdd, "onto queue:", AnimationQueue);
}

function switchState(nextState) {
  console.log("Switching to state", nextState);
  prevState = curState;

  switch (nextState) {
    case "walk":
      curGif = walkGif;
      lerpAmt = 0;
      gifPosStart = gifPos;
      const randX = random(IMAGE_W, width - IMAGE_W);
      gifPosDest = createVector(Math.floor(randX), height - IMAGE_H);
      if (gifPosDest.x <= gifPos.x) {
        gifPosDest.x += width;
      }
      gifPrevPos = gifPosStart;
      isSequence = false;
      curState = nextState;
      return;
    case "sit":
      curGif = sitGif;
      isSequence = false;
      curState = nextState;
      return;
    case "stretch":
      isSequence = true;
      sequenceIdx = 0;
      sequence = stretchSequence;
      sequenceMax = STRETCH_SEQUENCE_LEN;
      curGif = sequence[sequenceIdx];
      curState = nextState;
      return;
    case "toSit":
      isSequence = true;
      sequenceIdx = 0;
      sequence = toSitSequence;
      sequenceMax = TO_SIT_SEQUENCE_LEN;
      curGif = sequence[sequenceIdx];
      curState = nextState;
      return;
    case "fromSit":
      isSequence = true;
      sequenceIdx = 0;
      sequence = fromSitSequence;
      sequenceMax = FROM_SIT_SEQUENCE_LEN;
      curGif = sequence[sequenceIdx];
      curState = nextState;
      return;
    default:
      return;
  }
}

function draw() {
  // Draw gif
  background(206);

  if (!isSequence && curState !== "walk") {
    // we don't want to interrupt sequence
    if (AnimationQueue[0]) {
      // we pop the next animation on queue
      console.log("We have more animations to play");
      switchState(AnimationQueue.shift());
    }
  }

  /*** Play sequence for other non-loop states */
  if (isSequence) {
    // console.log("We are in sequence with state: ", curState);
    let idx = Math.floor(sequenceIdx / FRAME_RATE);
    image(sequence[idx], gifPos.x, height - IMAGE_H);
    if (sequenceIdx < sequenceMax * FRAME_RATE) {
      // still playing sequence
      sequenceIdx++;
      // console.log("sequenceIdx", idx);
    } else {
      isSequence = false;
    }
    return;
  } else {
    /*** Check if we are walking ***/
    let x = gifPosDest.x;
    if (curState === "walk") {
      let arrived = Math.ceil(gifPos.x) < Math.floor(gifPosDest.x);
      let notFullLerp = lerpAmt < 1;
      let isWalking = arrived && curState === "walk" && notFullLerp;
      if (isWalking) {
        console.log("pos", gifPos.x, "dest", gifPosDest.x);
        x = Math.ceil((1 - lerpAmt) * gifPosStart.x + lerpAmt * gifPosDest.x);
        // console.log("lerp", lerpAmt, "x", x);
        lerpAmt += STEP;
        // draw destination
        circle(
          (gifPosDest.x % width) + IMAGE_W / 2,
          height - IMAGE_H * 1.5,
          40
        );
      }

      if (curState === "walk" && !isWalking) {
        // turn off walk mode since we are not _walking_ anymore
        console.log("We are turning off walk");
        gifPos.x %= width;
        x = gifPos.x;
        gifPosDest.x = gifPos.x;
        switchState(AnimationQueue.shift());
      }
    }

    image(curGif, x % width, height - IMAGE_H);
    gifPos.x = x;
    gifPrevPos = gifPos;
  }
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
