// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Webcam Image Classification using a pre-trained customized model and p5.js
This example uses p5 preload function to create the classifier
=== */

// Classifier Variable
let classifier;
// Model URL
let imageModelURL = "https://teachablemachine.withgoogle.com/models/lHf5229LA/";

// Video
let video;
let flippedVideo;
// To store the classification
let label = "";

// Play corresponding cat gif
let mappingJson;

// keep track of state to play corresponding gif
let prevState = "sitting"; // default
let curState = prevState;
let curGif;

// gifs for states
let sitGif, walkGif;

// Load the model first
function preload() {
  classifier = ml5.imageClassifier(imageModelURL + "model.json");
  mappingJson = loadJSON("emotionMapResponse.json");
  sitGif = loadGif("sitting_30.gif");
  walkGif = loadGif("walk_30.gif");
  curGif = walkGif;
}

function setup() {
  createCanvas(500, 500);
  // Create the video
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  flippedVideo = ml5.flipImage(video);
  // Start classifying
  classifyVideo();
}

function draw() {
  background(color(220, 82, 86));
  // // Draw the video
  image(flippedVideo, 0, 0);

  // Draw the label
  fill(255);
  textSize(16);
  textAlign(CENTER);
  text(label, width / 2, 50);

  // Draw gif
  image(curGif, 0, 200);

  // image(walkGif, 0, 500);
}

function changeState() { 
  switch (curState) { 
    case 'Sitting':
      curGif = sitGif;
      break;
    case 'Walking':
      curGif = walkGif;
      break;
  }
}

// Get a prediction for the current video frame
function classifyVideo() {
  flippedVideo = ml5.flipImage(video);
  classifier.classify(flippedVideo, gotResult);
}

// When we get a result
function gotResult(error, results) {
  // If there is an error
  if (error) {
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
  // console.log(results[0]);
  label = results[0].label;
  prevState = curState;
  curState = mappingJson[label];
  if (curState !== prevState) { 
    changeState();
  }
  // Classifiy again!
  classifyVideo();
}
