# Cardiomyograph

Cardiomyograph: label-free analysis of cardiomyocyte contraction from brightfield video, from deep-learning motion fields to domain-resolved contraction phases, kinematic parameters, and recording-level phenotypes.

This repository accompanies a manuscript that is under review.

## What is available now

The files in this repository are a packaged Linux build. The package contains the analysis program and the trained weight. It does not contain the source code.

The source code will be released in this repository after the manuscript is published. The repository will be made public at the same time. Until publication, the repository remains private, and this packaged build is the form we distribute.

## What you need

- 64-bit Linux
- An NVIDIA GPU with a working CUDA driver
- Python 3.12

The program does not run on AMD GPUs, on integrated graphics, or on a machine with no NVIDIA GPU. If no NVIDIA GPU is detected, it prints a short message and exits.

## Install the Python packages

These commands use the Python 3.12 you want to run with.

```bash
python -m pip install numpy==2.0.2 scipy==1.17.1 opencv-python==4.13.0.90 scikit-learn==1.8.0 scikit-image==0.26.0 pandas==2.3.3 matplotlib==3.10.9 fastapi==0.136.3 uvicorn==0.38.0 python-multipart==0.0.20
python -m pip install torch==2.8.0+cu128 --index-url https://download.pytorch.org/whl/cu128
python -m pip install numpy==2.0.2
```

The last command pins NumPy back to 2.0.2. The PyTorch package index can replace it.

## Start

From this folder:

```bash
CMG_PYTHON=/path/to/python bash start.sh
```

`CMG_PYTHON` is the Python that has the packages above. The program listens only on this computer and opens a browser. Choose a video, then run the analysis. Click a domain on the map to see that domain's trace and parameters.

Results and copied videos are stored in `~/.local/share/Cardiomyograph`. Set `CMG_DATA_DIR` to use another folder.

## License

See `LICENSE`. The source code, once released after publication, will be under the same license.
