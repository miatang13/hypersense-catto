from fer import FER
from fer import Video
import cv2
import pprint

READ_IMG = False
READ_VID = True

if (READ_IMG):
    img = cv2.imread("tests/justin.jpg")
    detector = FER()
    result = detector.detect_emotions(img)
    emotion, score = detector.top_emotion(img) # get top emotion
    pprint.pprint(result)

if (READ_VID):
    video_filename = "tests/woman.mp4"
    video = Video(video_filename)

    # Analyze video, displaying the output
    detector = FER(mtcnn=True)
    raw_data = video.analyze(detector, display=True)
    df = video.to_pandas(raw_data)