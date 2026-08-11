import { NextResponse } from "next/server";
import localCharacterMap from "@/data/character-map.json";
import { CharacterSeed } from "@/lib/types";
import {
  fetchGithubJsonFile,
  isGithubSyncConfigured,
  updateGithubJsonFile,
} from "@/lib/github-sync";

const filePath = "src/data/character-map.json";

export async function GET() {
  try {
    const data = isGithubSyncConfigured()
      ? await fetchGithubJsonFile<CharacterSeed>(filePath)
      : (localCharacterMap as CharacterSeed);

    return NextResponse.json({ data, remoteEnabled: isGithubSyncConfigured() });
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
    const body = (await request.json()) as CharacterSeed;
    await updateGithubJsonFile(filePath, body, "Update character map data from readingbook");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "인물 관계 데이터를 GitHub에 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}