const GITLAB_URL = process.env.GITLAB_URL || "https://gitlab.com";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || "";
const GITLAB_PROJECT_ID = process.env.GITLAB_CONTENT_PROJECT_ID || "";

interface GitLabIssueResponse {
  id: number;
  iid: number;
  web_url: string;
}

async function gitlabFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${GITLAB_URL}/api/v4${path}`, {
    ...options,
    headers: {
      "PRIVATE-TOKEN": GITLAB_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function createIssue(
  title: string,
  description: string,
  labels?: string[],
  assignee?: string
): Promise<{ issueUrl: string; issueId: number }> {
  const res = await gitlabFetch(
    `/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        labels: labels?.join(","),
        assignee_username: assignee,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`GitLab API error: ${res.status} ${await res.text()}`);
  }

  const data: GitLabIssueResponse = await res.json();
  return { issueUrl: data.web_url, issueId: data.iid };
}

export async function createBranch(
  name: string,
  ref: string = "main"
): Promise<string> {
  const res = await gitlabFetch(
    `/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/repository/branches`,
    {
      method: "POST",
      body: JSON.stringify({ branch: name, ref }),
    }
  );

  if (!res.ok) {
    throw new Error(`GitLab API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.name;
}

export async function getFileHistory(
  filePath: string,
  branch: string = "main"
): Promise<Array<{ sha: string; author: string; date: string; message: string }>> {
  const res = await gitlabFetch(
    `/projects/${encodeURIComponent(GITLAB_PROJECT_ID)}/repository/commits?path=${encodeURIComponent(filePath)}&ref_name=${branch}&per_page=20`
  );

  if (!res.ok) return [];

  const commits = await res.json();
  return commits.map(
    (c: { id: string; author_name: string; created_at: string; message: string }) => ({
      sha: c.id,
      author: c.author_name,
      date: c.created_at,
      message: c.message,
    })
  );
}
