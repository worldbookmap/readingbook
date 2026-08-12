import { NextResponse } from "next/server";
import localStoryEvents from "@/data/story-event-library.json";
import { StoryTimelineLibrary } from "@/lib/types";
import {
  fetchGithubJsonFile,
  GithubSyncConflictError,
  isGithubSyncConfigured,
  updateGithubJsonFile,
} from "@/lib/github-sync";

const filePath = "src/data/story-event-library.json";

type StoryEventsPayload = {
  works: StoryTimelineLibrary["works"];
  sha?: string;
};

export async function GET() {
  try {
    const remoteEnabled = isGithubSyncConfigured();
    const remotePayload = remoteEnabled
      ? await fetchGithubJsonFile<StoryTimelineLibrary>(filePath)
      : null;
    const data = remotePayload?.data ?? (localStoryEvents as StoryTimelineLibrary);

    return NextResponse.json({ data, remoteEnabled, sha: remotePayload?.sha ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "사건 타임라인 데이터를 불러오지 못했습니다." },
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
    const body = (await request.json()) as StoryEventsPayload;
    const { sha, ...data } = body;
    const nextSha = await updateGithubJsonFile(
      filePath,
      data,
      "Update story event timeline data from readingbook",
      sha,
    );

    return NextResponse.json({ ok: true, sha: nextSha });
  } catch (error) {
    console.error(error);

    if (error instanceof GithubSyncConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "사건 타임라인 데이터를 GitHub에 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}
