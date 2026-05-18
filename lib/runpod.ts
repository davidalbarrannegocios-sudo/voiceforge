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

const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 300000;

async function submitJob(input: RunPodInput): Promise<string> {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    throw new Error("RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID is not set");
  }

  const url = `https://api.runpod.ai/v2/${endpointId}/run`;
  console.log(`[RunPod] submitting job to: ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;

  if (!apiKey || !endpointId) {
    throw new Error("RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID is not set");
  }

  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`RunPod status check failed (${res.status})`);
    }

    const data = await res.json();
    const elapsed = Math.round((Date.now() - (deadline - MAX_WAIT_MS)) / 1000);
    console.log(`[RunPod] job=${jobId} status=${data.status} elapsed=${elapsed}s`);

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
