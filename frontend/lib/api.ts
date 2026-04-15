const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000";

export type HistoryEntry = {
  id: number;
  user: string;
  nextStep: string;
  userReply: string;
  taskComment: string;
  risk: string;
};

export type TaskState = {
  type: string;
  priority: string;
  status: string;
  contractor: string;
  risk: string;
  checks: string[];
};

export type Task = {
  id: string;
  title: string;
  archived: boolean;
  ticketText: string;
  doneText: string;
  consultantComment: string;
  state: TaskState;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = "Ошибка запроса";

    try {
      const data = await res.json();
      message = data?.detail ?? message;
    } catch {
      // ignore json parse errors
    }

    throw new Error(message);
  }

  return res.json();
}

export function getTasks() {
  return request<Task[]>("/tasks");
}

export function createTask(payload: {
  id: string;
  ticketText: string;
  doneText: string;
  consultantComment: string;
}) {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendTaskUpdate(
  taskId: string,
  payload: { ticketText: string; doneText: string; consultantComment: string },
) {
  return request<{ task: Task }>(`/tasks/${taskId}/agent`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
