# OculoStack (MGAE-V15) 👁️

[![Deployment](https://img.shields.io/badge/Deployment-Docker-blue.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Offline--First-success.svg)](#)
[![Deep Learning](https://img.shields.io/badge/Backend-TensorFlow%20%7C%20Keras-orange.svg)](#)

OculoStack is a decentralized, offline-first, AI-driven diagnostic pipeline for ophthalmic diseases. Utilizing a multi-model ensemble (MGAE-V15), it analyzes both visual pixel data and device-generated EXIF metadata to provide high-accuracy detection and severity grading for multiple eye conditions.

## 🚀 Core Features

* **Multi-Disease Diagnostic Matrix:** Detects and grades the severity of Diabetic Retinopathy, Glaucoma, Cataracts, and Conjunctivitis.
* **Offline-First Architecture:** Decentralized local data storage allows the pipeline to function seamlessly in remote or low-connectivity environments.
* **Two-Stream Inference Engine:** Dynamically adjusts model ensemble weights during inference using both visual data and hardware EXIF metadata.
* **Visual Explainability:** Integrates Grad-CAM to generate visual heatmaps, highlighting the specific regions triggering the diagnosis.
* **Automated Clinical Reporting:** Transforms raw inference data and Grad-CAM outputs into structured, readable clinical reports.

## 🧠 System Architecture (Six-Layer Topology)

1. **Mobile Application:** Offline-capable UI for image capture and metadata extraction.
2. **Preprocessing Pipeline:** Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) and Gaussian noise reduction.
3. **MGAE Inference Engine:** A robust ensemble utilizing:
   * `EfficientNet-B4`
   * `ResNet-50`
   * `MobileNet-V3`
4. **Explainability Layer:** Grad-CAM generation for diagnostic transparency.
5. **Clinical Report Generation:** Automated data structuring and formatting.
6. **Federated Learning Support:** Secure, privacy-preserving model updates across distributed devices.

## 🛠️ Local Development & Deployment

This project utilizes Docker to ensure consistent environments across the complex MGAE inference engine.

### Prerequisites
* Docker & Docker Compose
* Python 3.10+ (for local script execution)

