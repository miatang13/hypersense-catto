const EXPRESSION_RECOGNITION = true;
const IMAGE_H = 216;
const IMAGE_W = 384;
const EXPRESSION_THRESHOLD = 70;
const DEBUG_ACTIONS = true;
const DEBUG_EXPRESSIONS = false;
const DEBUG_WALK = false;

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
let sitGif, walkGif;

// sequences for non-loop states
let stretchSequence = [];
let fromSitSequence = [];
let toSitSequence = [];
let shakeSequence = [];
let knitSequence = [];
const STRETCH_SEQUENCE_LEN = 98; // inclusive
const FROM_SIT_SEQUENCE_LEN = 32;
const TO_SIT_SEQUENCE_LEN = 41;
const SHAKE_SEQUENCE_LEN = 73;
const KNIT_SEQUENCE_LEN = 165;
let sequenceIdx = 0;
let sequenceMax;
let sequence;
const FRAME_RATE = 2; // 60 times per second
const SEQUENCE_DELAY = 0.04;
let isSequence = false;

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
  curGif = stateToGif(curState);

  let lengths = [
    STRETCH_SEQUENCE_LEN,
    FROM_SIT_SEQUENCE_LEN,
    TO_SIT_SEQUENCE_LEN,
    SHAKE_SEQUENCE_LEN,
    KNIT_SEQUENCE_LEN,
  ];
  let sequences = [
    stretchSequence,
    fromSitSequence,
    toSitSequence,
    shakeSequence,
    knitSequence,
  ];
  let folderNames = [
    "stretch",
    "TransitFromSit",
    "TransitToSit",
    "shake",
    "knit",
  ];

  lengths.forEach((len, index) => {
    for (let i = 0; i <= len; i++) {
      let img = loadImage(
        "gifs/sequence/" + folderNames[index] + "/" + i.toString() + ".png"
      );
      sequences[index].push(img);
    }
  });
}

function setup() {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  canvas.id("canvas");

  if (EXPRESSION_RECOGNITION) {
    setupFacialRecognition();
  }

  const randX = random(0, width - IMAGE_W);
  gifPos = createVector(width / 7, height - IMAGE_H * 1.5);
  gifPosDest = gifPos;

  if (DEBUG_ACTIONS) {
    // For testing
    button = createButton("Switch to walk");
    button.mousePressed(() => addToQueue("walk"));

    button1 = createButton("Switch to stretch");
    button1.mousePressed(() => addToQueue("stretch"));

    button2 = createButton("Switch to shake");
    button2.mousePressed(() => addToQueue("shake"));

    button2 = createButton("Switch to stretch");
    button2.mousePressed(() => addToQueue("stretch"));
  }

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
      gifPosDest = createVector(Math.floor(randX), height - IMAGE_H * 1.5);
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
    case "shake":
      isSequence = true;
      sequenceIdx = 0;
      sequence = shakeSequence;
      sequenceMax = SHAKE_SEQUENCE_LEN;
      curGif = sequence[sequenceIdx];
      curState = nextState;
      return;
    case "knit":
      isSequence = true;
      sequenceIdx = 0;
      sequence = knitSequence;
      sequenceMax = KNIT_SEQUENCE_LEN;
      curGif = sequence[sequenceIdx];
      curState = nextState;
    default:
      return;
  }
}

function draw() {
  // Draw gif
  // background(206);

  if (!isSequence && curState !== "walk") {
    // we don't want to interrupt sequence
    if (AnimationQueue[0]) {
      // we pop the next animation on queue
      console.log("We have more animations to play");
      switchState(AnimationQueue.shift());
    } else if (detections.length > 0) {
      // we don't have more animations to play
      // state must be sit

      // We will detect emotions and add animation to queue if it's not neutral
      let { neutral, happy, angry, sad, disgusted, surprised, fearful } =
        detections[0].expressions;
      const emotionArrStr = [
        "neutral",
        "happy",
        "angry",
        "sad",
        "disgusted",
        "surprised",
        "fearful",
      ];
      let emotionArr = [
        neutral,
        happy,
        angry,
        sad,
        disgusted,
        surprised,
        fearful,
      ];
      let maxScore = Math.max(...emotionArr);
      let i = emotionArr.indexOf(maxScore);

      if (i !== 0 && maxScore * 100 >= EXPRESSION_THRESHOLD) {
        // not neutral and goes over threshold
        let emotionStr = emotionArrStr[i];
        console.log("Detecting emotion: ", emotionStr);
        if (mappingJson[emotionStr]) {
          addToQueue(mappingJson[emotionStr]);
        }
      }
    }
  }

  /*** Play sequence for other non-loop states */
  if (isSequence) {
    // console.log("We are in sequence with state: ", curState);
    let idx = Math.floor(sequenceIdx / FRAME_RATE);
    image(sequence[idx], gifPos.x, height - IMAGE_H * 1.5);
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
        x = Math.ceil((1 - lerpAmt) * gifPosStart.x + lerpAmt * gifPosDest.x);
        // console.log("lerp", lerpAmt, "x", x);
        lerpAmt += STEP;
        if (DEBUG_WALK) {
          // draw destination
          console.log("pos", gifPos.x, "dest", gifPosDest.x);
          circle(
            (gifPosDest.x % width) + IMAGE_W / 2,
            height - IMAGE_H * 1.5,
            40
          );
        }
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

    image(curGif, x % width, height - IMAGE_H * 1.5);
    gifPos.x = x;
    gifPrevPos = gifPos;
  }
}

/************** EMOTION RECOGNITION  ***************/
// facial detection code from:
// https://github.com/Creativeguru97/YouTube_tutorial/tree/master/Play_with_APIs/ml5_faceApi/face-api_videoInput/final
function setupFacialRecognition() {
  video = createCapture(VIDEO);
  video.id("video");
  video.size(width / 4, height / 4);
  video.hide();

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

  if (DEBUG_EXPRESSIONS) {
    if (detections.length > 0) {
      clear();
      let { neutral, happy, angry, sad, disgusted, surprised, fearful } =
        detections[0].expressions;
      x = 5;
      y = 5;
      textYSpace = 15;
      text("neutral:       " + nf(neutral * 100, 2, 2) + "%", x, y);
      text("happiness: " + nf(happy * 100, 2, 2) + "%", x, y + textYSpace);
      text(
        "anger:        " + nf(angry * 100, 2, 2) + "%",
        x,
        y + textYSpace * 2
      );
      text(
        "sad:            " + nf(sad * 100, 2, 2) + "%",
        x,
        y + textYSpace * 3
      );
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
    }
  }

  faceapi.detect(gotFaces);
}
