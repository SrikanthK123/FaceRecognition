import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import '../App.css';

const Home = () => {
    const [referenceImage, setReferenceImage] = useState(null);
    const [result, setResult] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const [webcamActive, setWebcamActive] = useState(false);
    const [buttonClicked, setButtonClicked] = useState(false);
    const [animationClass, setAnimationClass] = useState("");

    useEffect(() => {
        const loadModels = async () => {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
                faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
                faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
                faceapi.nets.ageGenderNet.loadFromUri("/models"),
                faceapi.nets.faceExpressionNet.loadFromUri("/models"),
            ]);
            setModelsLoaded(true);
        };

        loadModels();
    }, []);

    const handleReferenceImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setReferenceImage(imageUrl);
        }
    };

    const startWebcam = async () => {
        setWebcamActive(true);
        setAnimationClass("animate-center");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoRef.current.srcObject = stream;

            videoRef.current.onloadedmetadata = () => {
                videoRef.current.play().catch((error) => {
                    console.error("Error trying to play the video:", error);
                });
            };

            // Remove animation class after a short delay to allow centering
            setTimeout(() => {
                setAnimationClass("");
            }, 500);
        } catch (error) {
            console.error('Error accessing webcam:', error);
            alert('Could not access webcam. Please check your permissions.');
        }
    };

    const recognizeFaces = async () => {
        setButtonClicked(true);

        if (!modelsLoaded) {
            alert("Models are still loading. Please wait.");
            return;
        }

        if (referenceImage) {
            const referenceImg = await faceapi.fetchImage(referenceImage);
            const referenceDetect = await faceapi.detectAllFaces(referenceImg).withFaceLandmarks().withFaceDescriptors();
            const referenceDescriptors = referenceDetect.map(d => d.descriptor);

            const intervalId = setInterval(async () => {
                const video = videoRef.current;
                const targetDetect = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors().withAgeAndGender();

                if (targetDetect.length > 0) {
                    const targetDescriptors = targetDetect.map(d => d.descriptor);
                    const faceMatcher = new faceapi.FaceMatcher(referenceDescriptors);
                    const matchResults = targetDescriptors.map(descriptor => {
                        const bestMatch = faceMatcher.findBestMatch(descriptor);
                        return { label: bestMatch.label, confidence: bestMatch.distance };
                    });

                    const confidenceThreshold = 0.6;
                    const matchedFacesSet = new Set();
                    const matchedFacesArray = [];

                    matchResults.forEach((result, index) => {
                        if (result.confidence < confidenceThreshold) {
                            if (!matchedFacesSet.has(result.label)) {
                                matchedFacesSet.add(result.label);
                                matchedFacesArray.push({
                                    label: result.label,
                                    detection: targetDetect[index],
                                });
                            }
                        }
                    });

                    const matchCount = matchedFacesArray.length;

                    if (matchCount > 0) {
                        const matchedFacesMessage = matchedFacesArray.map(face => `${face.label}`).join(", ");
                        setResult(`Matched Face(s): ${matchedFacesMessage} | Total Matches: ${matchCount}`);
                    } else {
                        setResult("No match found.");
                    }

                    const canvas = canvasRef.current;
                    const displaySize = { width: video.videoWidth, height: video.videoHeight };
                    faceapi.matchDimensions(canvas, displaySize);

                    const context = canvas.getContext("2d");
                    context.clearRect(0, 0, canvas.width, canvas.height);

                    await Promise.all(targetDetect.map(async (detection, index) => {
                        const { x, y, width, height } = detection.detection.box;

                        const matchedFace = matchedFacesArray.find(face => face.label === matchResults[index].label);
                        const label = matchedFace ? matchedFace.label : "Unknown";

                        context.fillStyle = "cyan";
                        context.font = "15px Arial";
                        context.fillText(label, x, y > 10 ? y - 5 : 10);

                        const age = detection.age.toFixed(0);
                        const gender = detection.gender;
                        context.fillText(`Age: ${age}, Gender: ${gender}`, x, y > 10 ? y - 20 : 10);

                        context.strokeStyle = matchedFace ? "green" : "red";
                        context.lineWidth = matchedFace ? 3 : 2;
                        context.strokeRect(x, y, width, height);
                    }));
                } else {
                    setResult("Face(s) not detected.");
                }
            }, 100);

            return () => clearInterval(intervalId);
        }
    };

    return (
        <>
            <h1 style={{ backgroundColor: '#5b446a', color: 'white', borderRadius: '10px', padding: '10px', fontSize: '24px' }}>Face Recognition App</h1>
            
            <div className="container col-xxl-8 px-4 py-5"> 
                <div className="image-container " style={{ marginBottom: '20px',backgroundColor:'#d3d6db',borderRadius:'10px',boxShadow:'rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px' }}>
                    <input
                        type="file"
                        id="referenceImage"
                        accept="image/*"
                        className="custom-file-input p-2"
                        onChange={handleReferenceImageChange}
                    />
                    {referenceImage && <img src={referenceImage} alt="Reference" width="100%" className="m-4" style={{ maxWidth: '250px', marginTop: '10px', borderRadius: '5px',boxShadow:'rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px' }} />}
                </div>

                <div className="row flex-lg-row-reverse align-items-center g-5 py-5">
                    <div className={`col-12 col-lg-6 ${animationClass} video-container`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {webcamActive && (
                                <div style={{ position: 'relative', marginBottom: '20px', width: '100%' }}>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{ width: '100%', maxWidth: '400px', height: 'auto', borderRadius: '8px', boxShadow: 'rgba(0, 0, 0, 0.09) 0px 2px 1px, rgba(0, 0, 0, 0.09) 0px 4px 2px, rgba(0, 0, 0, 0.09) 0px 8px 4px, rgba(0, 0, 0, 0.09) 0px 16px 8px, rgba(0, 0, 0, 0.09) 0px 32px 16px' }}
                                    />
                                    {buttonClicked && (
                                        <canvas
                                            ref={canvasRef}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-12 col-lg-6">
                        <p className="lead">Please click the <span style={{color:'#ff847c'}}>Start Webcam</span> button to begin.</p>
                        <button
                            className="btn  my-2 mx-2 text-white"
                            onClick={startWebcam}
                            style={{ width: '200px', padding: '10px', borderRadius: '5px', backgroundColor: '#2c786c' }}
                        >
                            Start Webcam
                        </button>
                        <button
                            className="btn  my-2 mx-2 text-white"
                            onClick={recognizeFaces}
                            style={{ width: '200px', padding: '10px', borderRadius: '5px', backgroundColor: '#c9356c' }}
                        >
                            Recognize Faces
                        </button>
                        <div className="mt-3">
                            {result && <p style={{ fontWeight: 'bold', marginTop: '10px',color:'#f8da5b',backgroundColor:'#247291',padding:'10px' }}>{result}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;
