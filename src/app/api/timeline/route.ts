import { NextResponse } from "next/server";
import localTimeline from "@/data/timeline.json";
import { TimelineCard } from "@/lib/types";
import {
  fetchGithubJsonFile,
  isGithubSyncConfigured,
  updateGithubJsonFile,
} from "@/lib/github-sync";

const filePath = "src/data/timeline.json";

type TimelinePayload = {
  cards: TimelineCard[];
};

export async function GET() {
  try {
    const data = isGithubSyncConfigured()
      ? await fetchGithubJsonFile<TimelinePayload>(filePath)
      : (localTimeline as TimelinePayload);

    return NextResponse.json({ data, remoteEnabled: isGithubSyncConfigured() });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "연표 데이터를 불러오지 못했습니다." },
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
    const body = (await request.json()) as TimelinePayload;
    await updateGithubJsonFile(filePath, body, "Update timeline data from readingbook");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "연표 데이터를 GitHub에 저장하지 못했습니다." },
      { status: 500 },
    );
  }
}