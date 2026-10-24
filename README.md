# Cardiomyograph

Cardiomyograph measures contraction from label-free brightfield video of cardiomyocytes. A browser window shows the domain map, the trace of the domain you select, and the measured parameters.

This repository accompanies a manuscript that is under review.

## What is available now

The files in this repository are a packaged Linux build. The package contains the analysis program and the trained weight. It does not contain the source code.

The source code will be released in this repository after the manuscript is published. The packaged build in this repository is public. The source code is not in this repository yet.

Five original example recordings used in the paper are available in the release [sample-data-v1](https://github.com/XianglabHeart/Cardiomyograph/releases/tag/sample-data-v1): a baseline/treated pair for 10 nM ISO (Figure 2), a baseline/treated pair for 50 nM E-4031 (Figure 3), and a recording of hiPSC-CMs carrying a heterozygous PKP2 variant (Figure 5C). SHA-256 checksums are provided in `SHA256SUMS.txt` in the same release.

## Online analysis

An online demonstration is available at [analysis.xianglab.online](https://analysis.xianglab.online/). The current public site provides the example recordings for interactive exploration. Upload and analysis of user-supplied recordings will be enabled in a future release.

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

This packaged build is free for non-commercial research and academic teaching. Commercial use, modification, and sale are not permitted. See LICENSE.
