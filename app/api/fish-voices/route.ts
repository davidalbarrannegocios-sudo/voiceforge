import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ACCENT_TERMS: Record<string, string[]> = {
  mexico: ["mexican", "mexico", "méxico", "mexicano", "mexicana", "mx", "aztec", "guadalajara", "monterrey", "cdmx", "español mexicano"],
  spain: ["spain", "españa", "castellano", "castilian", "iberian", "peninsular", "spaniard", "español de españa"],
  latam: ["latin", "latam", "colombia", "argentina", "chile", "peru", "venezuela", "latino", "latina", "colombiano", "argentino", "chileno"],
};

const MANUAL_ACCENT_VOICES: Record<string, string[]> = {
  mexico: [
    "8d2c17a9b26d4d83888ea67a1ee565b2",
    "dfa5b230c8054f429e434f4a6e9bbdec",
    "3f45a7fd7a614655a61eb7027b955783",
    "35199d5438854f5d9157c500479ab684",
    "43e1948b1a544700bd88250916cd31e8",
    "a335d470fff248e8890dce6550a2874b",
    "ac594943984a47e7a827416eb263c7b1",
    "dc0746cd45dd40deb6bca32dc87fd7f5",
    "a6e3e3fc373e4de7916e221725c56938",
    "6c4b8a09f7934582843c82a7a36173c1",
    "17ed67335f0145c9a850fddecd3c40e0",
    "d047b6a8f24f4d56ba818b08dbd9d089",
    "9fe33e2476e644aa9d8126d0c95edf1d",
    "2d78a7eec7e041d88eec116edf6bce98",
    "63f135893358411ab5926d9d5b5e7878",
    "95619e57f2484596b3cfa3ffbe55f2da",
    "cc19dc88556b4dc4ac2b0da91680b162",
    "0b2aa74c364a49789bcba051f2901a5c",
    "33c2f0f954544b41b0e795e23d59df7d",
    "d4ea43a56f5a42f1959ec7846a4fb59b",
    "f4210324af9d4a28a9cfe15f74a9cd84",
    "fb146e57407540f0be6863063d94bea5",
    "f82e642854d84fa08b78bff5fd29ad1e",
    "5e95c590cfcb46ab927a9ec7b35a88c7",
    "9f850ee9ada24b20a6866825eaefd3f8",
    "48158c12018e495ab4bc2a9cbd2eff8e",
    "c87656721dda48a7906f990f036ce76f",
    "057ca32a305141cca13ca6d0cbf757e8",
    "40321316304645ee95180d1f9d9f4406",
    "def180b161a3498db94025d5124fcb2a",
    "47a7c0605b6a4a658acc1fb85df19444",
    "23c015fc5d2c43c6b783c6c3982b7170",
    "70e38f80bf714e2e90401efb95fd422e",
    "a1070fc5bc824bb79dfa0007c00dfd0f",
    "7c76e349434d4f1e97078d924acea65f",
    "a2da31d160434e68a6288e18069c6928",
    "6ab5137ef3f04a04b51c6ab8eb0ad159",
    "a1611a6571ad4b61814a01e89360a909",
    "610a5884a3c046be9a4f031291531a68",
    "4fe8753bf11548989249134aada74d68",
    "3f56a67897df4d218eac6494ff88337f",
    "7fd90c67b9bf4938b61d3828d40b7f33",
    "f765b445ca784776b1d444bd5f418050",
    "a79200726503422b84ba0d381f4cce4e",
    "9ea79fe31584435abe88b02e7aed4e6e",
    "5063c91739b64e83bd59182d33d03ad2",
    "9e65aa72e2694588aa42fab31a10c482",
    "879eb4f6a86b45ccaf5e41282ea02312",
    "3fc09d9cd6bc445095b00b9eebd90960",
    "af832734cbb14c68b5233ea60997d746",
    "507148d3f1c140278af140fa398a2e0f",
    "35929683c49c4ec0bf779dc07d22620b",
    "74d956ea95a54ce5814084787b09d9d8",
    "7b009076e19e42b6b831dc2d86989c50",
    "075f4afe629b49ecabed6debd3be1190",
    "95f7b8fe6a264953bad59931c6f8c571",
    "44cc9923b0b443e8a1a7887fed528c17",
    "db333e503b414c0ca4263c7aa42b3548",
    "70a32604591b4a67b0f49f2054164e76",
    "5fa8ce4e59404ed5944524bcd43c548b",
    "f2461bf949b144ef9cb13a7f722bf942",
    "f3460067a9c24271a0d5854ffd850922",
    "4b6f451a3a344a73bc5d3e0923032f7f",
    "46be3d88cd1a463da4f1d2a823ff5501",
    "08cf264130f24b6ca0975b481f51801a",
  ],
  spain: [],
  latam: [],
};

type FishItem = {
  _id: string;
  title?: string;
  description?: string;
  tags?: string[];
  cover_image?: string | null;
};

function normalizeCoverImage(item: FishItem): FishItem {
  const FISH_CDN = "https://files.fish.audio";
  return {
    ...item,
    cover_image:
      typeof item.cover_image === "string" && item.cover_image
        ? item.cover_image.startsWith("http")
          ? item.cover_image
          : `${FISH_CDN}/${item.cover_image.replace(/^\//, "")}`
        : null,
  };
}

export async function GET(req: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FISH_AUDIO_API_KEY not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const language = searchParams.get("language") ?? "es";
  const search = searchParams.get("search") ?? "";
  const page = searchParams.get("page") ?? "1";
  const tag = searchParams.get("tag") ?? "";
  const accent = searchParams.get("accent") ?? "";

  if (accent && accent !== "all") {
    const manualIds = MANUAL_ACCENT_VOICES[accent] ?? [];
    const terms = ACCENT_TERMS[accent] ?? [];

    // Fetch a broad pool sorted by popularity
    const accentParams = new URLSearchParams({ page_size: "200", sort_by: "task_count" });
    const accentRes = await fetch(`https://api.fish.audio/model?${accentParams}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const accentData = await accentRes.json();
    const pool: FishItem[] = accentData.items ?? [];

    // Manual voices: from pool first, then fetch individually for any missing IDs
    const poolById = new Map(pool.map((v) => [v._id, v]));
    const manualInPool = manualIds.filter((id) => poolById.has(id)).map((id) => poolById.get(id)!);
    const missingIds = manualIds.filter((id) => !poolById.has(id));

    const fetchedIndividually: FishItem[] = await Promise.all(
      missingIds.map(async (id) => {
        const r = await fetch(`https://api.fish.audio/model/${id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return r.ok ? await r.json() : null;
      })
    ).then((results) => results.filter(Boolean) as FishItem[]);

    const manualVoices = [...manualInPool, ...fetchedIndividually];

    // Auto voices: text match, excluding manual IDs
    const manualIdSet = new Set(manualIds);
    const autoVoices = pool.filter((v) => {
      if (manualIdSet.has(v._id)) return false;
      const searchText = `${v.title ?? ""} ${v.description ?? ""} ${(v.tags ?? []).join(" ")}`.toLowerCase();
      return terms.some((term) => searchText.includes(term));
    });

    const items = [...manualVoices, ...autoVoices].map(normalizeCoverImage);
    const accentNotEnough = items.length < 5;

    return Response.json({ items, total: items.length, accentNotEnough });
  }

  // Normal (non-accent) fetch
  const params = new URLSearchParams({
    page_size: "20",
    page_number: page,
    sort_by: "task_count",
    language,
  });
  if (search) params.set("title", search);
  if (tag) params.set("tag", tag);

  const res = await fetch(`https://api.fish.audio/model?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Fish Audio error: ${text}` }, { status: res.status });
  }

  const data = await res.json();
  if (Array.isArray(data.items)) {
    data.items = data.items.map(normalizeCoverImage);
  }

  return NextResponse.json(data);
}
