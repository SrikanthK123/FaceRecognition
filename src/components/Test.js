// Test.js
import React, { useEffect, useRef, useState } from 'react';
import * as tmImage from '@teachablemachine/image';
import '@tensorflow/tfjs';
import * as tf from '@tensorflow/tfjs';

const URL = "https://teachablemachine.withgoogle.com/models/wtAgV2TlP/";

const Test = () => {
    const [model, setModel] = useState(null);
    const [maxPredictions, setMaxPredictions] = useState(0);
    const webcamRef = useRef(null);
    const labelContainerRef = useRef(null);

    useEffect(() => {
        const loadModel = async () => {
            const modelURL = URL + "model.json";
            const metadataURL = URL + "metadata.json";
            const loadedModel = await tmImage.load(modelURL, metadataURL);
            setModel(loadedModel);
            setMaxPredictions(loadedModel.getTotalClasses());
        };

        loadModel();
    }, []);

    useEffect(() => {
        const setupWebcam = async () => {
            const flip = true;
            const webcam = new tmImage.Webcam(200, 200, flip);
            await webcam.setup(); 
            await webcam.play();
            webcamRef.current = webcam;

            const loop = async () => {
                webcam.update();
                await predict();
                window.requestAnimationFrame(loop);
            };

            loop();

            const webcamContainer = document.getElementById("webcam-container");
            webcamContainer.appendChild(webcam.canvas);
        };

        if (model) {
            setupWebcam();
        }
    }, [model]);

    const predict = async () => {
        if (!model || !webcamRef.current) return;

        const prediction = await model.predict(webcamRef.current.canvas);
        if (labelContainerRef.current) {
            for (let i = 0; i < maxPredictions; i++) {
                const classPrediction =
                    `${prediction[i].className}: ${prediction[i].probability.toFixed(2)}`;
                labelContainerRef.current.childNodes[i].innerHTML = classPrediction;
            }
        }
    };

    return (
        <div>
            <div>Teachable Machine Image Model</div>
            <div id="webcam-container"></div>
            <div id="label-container" ref={labelContainerRef}>
                {Array.from({ length: maxPredictions }).map((_, i) => (
                    <div key={i}></div>
                ))}
            </div>
        </div>
    );
};

export default Test;
