# Dataset

## Quick start (synthetic data — works immediately, no internet needed)

```bash
cd dataset
pip install -r requirements.txt
python generate_synthetic_dataset.py --out ./data --clips_per_class 60
```

This creates:
```
dataset/data/
  footsteps/footsteps_000.wav ...
  vehicle/vehicle_000.wav ...
  glass_break/glass_break_000.wav ...
  normal/normal_000.wav ...
```

These are procedurally generated (footsteps = low-freq impact pulses, vehicle = harmonic
rumble, glass_break = high-frequency transient burst, normal = pink noise). They're
designed to be acoustically distinct enough to validate your whole pipeline end-to-end,
but they are **not real audio** — do not use these for your final report/demo accuracy claims.

## Upgrading to real audio before your final demo

Replace/augment the synthetic clips with real audio, keeping the same folder structure
(`data/<class_name>/*.wav`):

1. **Record your own** — especially footsteps near your actual mic/hardware.
2. **Download public datasets:**
   - ESC-50: https://github.com/karolpiczak/ESC-50 (has `footsteps`, `glass_breaking` categories)
   - UrbanSound8K: https://urbansounddataset.weebly.com/urbansound8k.html (has `engine_idling`, `car_horn`, `street_music` for vehicle/normal)
   - Freesound.org — search and filter by CC0 license

3. Resample everything to 16kHz mono and trim to ~3 seconds — `ml/feature_extraction.py`
   already handles resampling automatically via `librosa.load(path, sr=16000)`, so you can
   drop in files of any original sample rate.

4. Re-run training (`ml/train_model.py`) after swapping in real data.
