import runpod
import os
import base64
import uuid
import time
import io
import numpy as np
import soundfile as sf
import boto3
from botocore.config import Config

# ---------------------------------------------------------------------------
# R2 client setup
# ---------------------------------------------------------------------------
R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY  = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_KEY  = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET      = os.environ["R2_BUCKET_NAME"]
R2_PUBLIC_URL  = os.environ["R2_PUBLIC_URL"]

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

# ---------------------------------------------------------------------------
# Load Chatterbox model once — stays in memory across jobs on the same worker
# ---------------------------------------------------------------------------
print("Loading Chatterbox TTS model…")
from chatterbox.tts import ChatterboxTTS

DEVICE = "cuda"
MODEL = ChatterboxTTS.from_pretrained(device=DEVICE)
print("Chatterbox TTS model loaded.")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def download_from_r2(key: str) -> bytes:
    obj = s3.get_object(Bucket=R2_BUCKET, Key=key)
    return obj["Body"].read()


def upload_to_r2(key: str, data: bytes, content_type: str = "audio/wav") -> str:
    s3.put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType=content_type)
    return f"{R2_PUBLIC_URL}/{key}"


def wav_bytes_from_tensor(wav_tensor, sample_rate: int) -> bytes:
    audio_np = wav_tensor.squeeze().cpu().numpy()
    buf = io.BytesIO()
    sf.write(buf, audio_np, sample_rate, format="WAV")
    buf.seek(0)
    return buf.read()


def get_audio_duration(wav_bytes: bytes) -> float:
    buf = io.BytesIO(wav_bytes)
    data, sr = sf.read(buf)
    return len(data) / sr

# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

def handler(job):
    print(f"Job received: {job}")

    job_input = job.get("input", {})
    job_type = job_input.get("type")

    # ── GENERATE ──────────────────────────────────────────────────────────
    if job_type == "generate":
        text        = job_input["text"]
        voice_id    = job_input.get("voice_id", "default")
        exaggeration = float(job_input.get("exaggeration", 0.5))
        user_id     = job_input["user_id"]

        audio_prompt_path = None

        r2_key = job_input.get("r2_key")
        print(f"[generate] voice_id={voice_id} r2_key={r2_key}")

        if r2_key:
            try:
                ref_bytes = download_from_r2(r2_key)
                tmp_path = f"/tmp/ref_{voice_id}.wav"
                with open(tmp_path, "wb") as f:
                    f.write(ref_bytes)
                audio_prompt_path = tmp_path
                print(f"[generate] loaded reference audio from {r2_key}")
            except Exception as e:
                print(f"Warning: could not load reference voice from {r2_key} ({e}), using default.")

        # When using a cloned voice, fix exaggeration and cfg_weight for
        # better accent/voice fidelity regardless of what the user sent.
        if audio_prompt_path:
            gen_exaggeration = 0.5
            gen_cfg_weight   = 3.0
        else:
            gen_exaggeration = exaggeration
            gen_cfg_weight   = 0.5  # Chatterbox default

        print(f"[generate] exaggeration={gen_exaggeration} cfg_weight={gen_cfg_weight} cloned={'yes' if audio_prompt_path else 'no'}")

        wav = MODEL.generate(
            text,
            audio_prompt_path=audio_prompt_path,
            exaggeration=gen_exaggeration,
            cfg_weight=gen_cfg_weight,
        )

        wav_data = wav_bytes_from_tensor(wav, MODEL.sr)
        duration = get_audio_duration(wav_data)

        # Upload to R2
        timestamp = int(time.time() * 1000)
        out_key = f"generated/{user_id}/{timestamp}.wav"
        audio_url = upload_to_r2(out_key, wav_data)

        return {
            "audio_url": audio_url,
            "duration_seconds": round(duration, 2),
            "characters_used": len(text),
        }

    # ── CLONE ─────────────────────────────────────────────────────────────
    elif job_type == "clone":
        audio_b64  = job_input["audio_base64"]
        voice_name = job_input["voice_name"]
        user_id    = job_input["user_id"]

        audio_bytes = base64.b64decode(audio_b64)
        voice_id    = str(uuid.uuid4())

        ref_key = f"reference-voices/{user_id}/{voice_id}.wav"

        # Decode, trim to first 15 s, and upload as WAV
        buf = io.BytesIO(audio_bytes)
        data, sr = sf.read(buf)
        max_samples = int(15 * sr)
        data = data[:max_samples]
        duration_s = len(data) / sr
        print(f"[clone] reference audio trimmed to {duration_s:.1f}s at {sr}Hz")

        wav_buf = io.BytesIO()
        sf.write(wav_buf, data, sr, format="WAV")
        wav_buf.seek(0)

        upload_to_r2(ref_key, wav_buf.read())

        return {
            "voice_id": voice_id,
            "voice_name": voice_name,
        }

    else:
        return {"error": f"Unknown job type: {job_type}"}


runpod.serverless.start({"handler": handler})
