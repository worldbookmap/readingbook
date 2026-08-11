import { NextResponse } from "next/server";
import localCharacterMap from "@/data/character-map-library.json";
import { CharacterMapLibrary, CharacterSeed } from "@/lib/types";
import {
  fetchGithubJsonFile,
  GithubSyncConflictError,
  isGithubSyncConfigured,
  updateGithubJsonFile,
} from "@/lib/github-sync";

const filePath = "src/data/character-map.json";

type CharacterMapSavePayload = {
  library?: CharacterMapLibrary;
  works?: CharacterMapLibrary["works"];
  data?: CharacterSeed;
  nodes?: CharacterSeed["nodes"];
  relationships?: CharacterSeed["relationships"];
  sha?: string;
};

function normalizeCharacterMapPayload(payload: CharacterMapSavePayload | CharacterMapLibrary | CharacterSeed | null | undefined): CharacterMapLibrary {
  if (!payload) {
    return {
      works: [
        {
          id: "default",
          title: "기본 인물관계도",
          titleKo: "기본 인물관계도",
          author: "Readingbook",
          seed: { nodes: [], relationships: [] },
        },
      ],
    };
  }

  if ("works" in payload && Array.isArray(payload.works)) {
    return payload as CharacterMapLibrary;
  }

  if ("nodes" in payload && Array.isArray(payload.nodes)) {
    return {
      works: [
        {
          id: "default",
          title: "기본 인물관계도",
          titleKo: "기본 인물관계도",
          author: "Readingbook",
          seed: {
            nodes: payload.nodes,
            relationships: payload.relationships ?? [],
          },
        },
      ],
    };
  }

  return {
    works: [
      {
        id: "default",
        title: "기본 인물관계도",
        titleKo: "기본 인물관계도",
        author: "Readingbook",
        seed: { nodes: [], relationships: [] },
      },
    ],
  };
}

export async function GET() {
  try {
    const remoteEnabled = isGithubSyncConfigured();
    const remotePayload = remoteEnabled ? await fetchGithubJsonFile<CharacterMapLibrary>(filePath) : null;
    const data = normalizeCharacterMapPayload(remotePayload?.data ?? (localCharacterMap as CharacterMapLibrary));

    return NextResponse.json({ data, remoteEnabled, sha: remotePayload?.sha ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "인물 관계 데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isGithubSyncConfigured()) {
    return NextResponse.json(
      { error: "GitHub 동기화 환경변수가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as CharacterMapSavePayload;
    const { sha, ...rawData } = body;
    const data = normalizeCharacterMapPayload(rawData);
    const nextSha = await updateGithubJsonFile(
      filePath,
      data,
      "Update character map data from readingbook",
      sha,
    );

    return NextResponse.json({ ok: true, sha: nextSha });
  } catch (error) {
    console.error(error);

    if (error instanceof GithubSyncConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "인물 관계 데이터를 GitHub에 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}