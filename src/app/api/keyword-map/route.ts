import { NextResponse } from "next/server";
import localKeywordMap from "@/data/keyword-map.json";
import {
  fetchGithubJsonFile,
  GithubSyncConflictError,
  isGithubSyncConfigured,
  updateGithubJsonFile,
} from "@/lib/github-sync";

const filePath = "src/data/keyword-map.json";

type KeywordMapDocument = {
  id: string;
  title: string;
  updatedAt: string;
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

type KeywordMapPayload = {
  documents: KeywordMapDocument[];
  sha?: string;
};

export async function GET() {
  try {
    const remoteEnabled = isGithubSyncConfigured();
    const remotePayload = remoteEnabled
      ? await fetchGithubJsonFile<{ documents: KeywordMapDocument[] }>(filePath)
      : null;
    const data = remotePayload?.data ?? (localKeywordMap as { documents: KeywordMapDocument[] });

    return NextResponse.json({ data, remoteEnabled, sha: remotePayload?.sha ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "키워드맵 데이터를 불러오지 못했습니다." },
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
    const body = (await request.json()) as KeywordMapPayload;
    const { sha, ...data } = body;
    const nextSha = await updateGithubJsonFile(
      filePath,
      data,
      "Update keyword map data from readingbook",
      sha,
    );

    return NextResponse.json({ ok: true, sha: nextSha });
  } catch (error) {
    console.error(error);

    if (error instanceof GithubSyncConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "키워드맵 데이터를 GitHub에 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
