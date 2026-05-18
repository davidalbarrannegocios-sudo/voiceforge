const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY!;
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID!;
const BASE_URL = `https://api.runpod.io/v2/${RUNPOD_ENDPOINT_ID}`;

type RunPodInput =
  | {
      type: "generate";
      text: string;
      voice_id: string;
      exaggeration: number;
      user_id: string;
    }
  | {
      type: "clone";
      audio_base64: string;
      voice_name: string;
      user_id: string;
    };

interface RunPodGenerateOutput {
  audio_url: string;
  duration_seconds: number;
  characters_used: number;
}

interface RunPodCloneOutput {
  voice_id: string;
  voice_name: string;
}

const headers = {
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
  "Content-Type": "application/json",
};

async function pollStatus(jobId: string, maxWaitMs = 120000): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${BASE_URL}/status/${jobId}`, { headers });
    const data = await res.json();
    if (data.status === "COMPLETED") return data.output;
    if (data.status === "FAILED") throw new Error(data.error || "RunPod job failed");
  }
  throw new Error("RunPod job timed out");
}

export async function runPodGenerate(
  input: Extract<RunPodInput, { type: "generate" }>
): Promise<RunPodGenerateOutput> {
  const res = await fetch(`${BASE_URL}/runsync`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input }),
  });

  const data = await res.json();

  // runsync returned immediately with COMPLETED
  if (data.status === "COMPLETED") {
    return data.output as RunPodGenerateOutput;
  }

  // Job is still running — poll for result
  if (data.id) {
    const output = await pollStatus(data.id);
    return output as RunPodGenerateOutput;
  }

  throw new Error(data.error || "RunPod request failed");
}

export async function runPodClone(
  input: Extract<RunPodInput, { type: "clone" }>
): Promise<RunPodCloneOutput> {
  const res = await fetch(`${BASE_URL}/runsync`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input }),
  });

  const data = await res.json();

  if (data.status === "COMPLETED") {
    return data.output as RunPodCloneOutput;
  }

  if (data.id) {
    const output = await pollStatus(data.id);
    return output as RunPodCloneOutput;
  }

  throw new Error(data.error || "RunPod clone failed");
}
