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

const authHeaders = {
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
  "Content-Type": "application/json",
};

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 300000;

async function submitJob(input: RunPodInput): Promise<string> {
  const res = await fetch(`${BASE_URL}/run`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunPod submit failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (!data.id) {
    throw new Error(`RunPod did not return a job id: ${JSON.stringify(data)}`);
  }

  return data.id as string;
}

async function pollUntilDone(jobId: string): Promise<unknown> {
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${BASE_URL}/status/${jobId}`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      throw new Error(`RunPod status check failed (${res.status})`);
    }

    const data = await res.json();

    console.log(`[RunPod] job=${jobId} status=${data.status} elapsed=${Math.round((Date.now() - (deadline - MAX_WAIT_MS)) / 1000)}s`);

    if (data.status === "COMPLETED") return data.output;
    if (data.status === "FAILED") {
      throw new Error(data.error || `RunPod job ${jobId} failed`);
    }
    // IN_QUEUE / IN_PROGRESS → keep polling
  }

  throw new Error(`RunPod job ${jobId} timed out after ${MAX_WAIT_MS / 1000}s`);
}

async function runJob<T>(input: RunPodInput): Promise<T> {
  const jobId = await submitJob(input);
  const output = await pollUntilDone(jobId);
  return output as T;
}

export async function runPodGenerate(
  input: Extract<RunPodInput, { type: "generate" }>
): Promise<RunPodGenerateOutput> {
  return runJob<RunPodGenerateOutput>(input);
}

export async function runPodClone(
  input: Extract<RunPodInput, { type: "clone" }>
): Promise<RunPodCloneOutput> {
  return runJob<RunPodCloneOutput>(input);
}
