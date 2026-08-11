type GithubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

type GithubContentResponse = {
  sha: string;
  content: string;
};

export class GithubSyncConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubSyncConflictError";
  }
}

export function isGithubSyncConfigured() {
  return Boolean(
    process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO,
  );
}

function getGithubConfig(): GithubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token || !owner || !repo) {
    throw new Error("GitHub sync environment variables are not configured.");
  }

  return { token, owner, repo, branch };
}

async function githubRequest(path: string, init?: RequestInit) {
  const config = getGithubConfig();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${body}`);
  }

  return response;
}

export async function fetchGithubJsonFile<T>(path: string): Promise<{ data: T; sha: string }> {
  const config = getGithubConfig();
  const response = await githubRequest(
    `/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
  );
  const payload = (await response.json()) as GithubContentResponse;
  const text = Buffer.from(payload.content, "base64").toString("utf8");

  return {
    data: JSON.parse(text) as T,
    sha: payload.sha,
  };
}

export async function updateGithubJsonFile<T>(
  path: string,
  data: T,
  message: string,
  expectedSha?: string,
) {
  const config = getGithubConfig();
  const currentResponse = await githubRequest(
    `/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`,
  );
  const currentPayload = (await currentResponse.json()) as GithubContentResponse;

  if (expectedSha && currentPayload.sha !== expectedSha) {
    throw new GithubSyncConflictError("원격 데이터가 먼저 변경되었습니다. 새로고침 후 다시 저장하세요.");
  }

  const content = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8").toString("base64");

  const updateResponse = await githubRequest(`/repos/${config.owner}/${config.repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content,
      sha: currentPayload.sha,
      branch: config.branch,
    }),
  });

  const updatePayload = (await updateResponse.json()) as {
    content: { sha: string };
  };

  return updatePayload.content.sha;
}