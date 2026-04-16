"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

type TaskState = {
  type: string;
  priority: string;
  status: string;
  contractor: string;
  risk: string;
  checks: string[];
};

type HistoryEntry = {
  id: number;
  user: string;
  nextStep: string;
  userReply: string;
  taskComment: string;
  risk: string;
};

type Task = {
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

type CreateTaskPayload = {
  id: string;
  ticketText: string;
  doneText: string;
  consultantComment: string;
};

type AgentPayload = {
  ticketText: string;
  doneText: string;
  consultantComment: string;
};

const statusToneMap: Record<string, string> = {
  Новая: "border-slate-600/80 bg-slate-500/10 text-slate-200",
  "В работе": "border-blue-500/30 bg-blue-500/10 text-blue-200",
  "Ожидаю ответ пользователя": "border-amber-500/30 bg-amber-500/10 text-amber-200",
  "Ожидаю ответ в чате сопровождения": "border-violet-500/30 bg-violet-500/10 text-violet-200",
  "Обращение на портале": "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  Тестирование: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  Решено: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

const statusOptions = [
  "Все",
  "Новая",
  "В работе",
  "Ожидаю ответ пользователя",
  "Ожидаю ответ в чате сопровождения",
  "Обращение на портале",
  "Тестирование",
  "Решено",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactText(text: string, max = 90) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Без названия";
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function splitUserBlock(raw: string) {
  const parts = raw.split("\n").filter(Boolean);

  return {
    ticketText:
      parts.find((x) => x.startsWith("Текст тикета:"))?.replace("Текст тикета:", "").trim() || "",
    doneText:
      parts.find((x) => x.startsWith("Что уже сделано:"))?.replace("Что уже сделано:", "").trim() || "",
    consultantComment:
      parts
        .find((x) => x.startsWith("Комментарий консультанта:"))
        ?.replace("Комментарий консультанта:", "")
        .trim() || "",
  };
}

function SectionCard({
  title,
  children,
  action,
  compact = false,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-white/8 bg-[#061427]/92 backdrop-blur-sm shadow-[0_10px_30px_rgba(2,8,23,0.22)]",
        compact ? "p-3" : "p-3.5"
      )}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[17px] leading-none font-semibold tracking-[-0.02em] text-sky-100">
            {title}
          </h3>
          {action}
        </div>
      ) : action ? (
        <div className="mb-3 flex justify-end">{action}</div>
      ) : null}

      {children}
    </section>
  );
}

function MetaField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.022] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-[13px] text-slate-100">{value || "—"}</div>
    </div>
  );
}

function HistoryBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.022] px-3 py-2.5">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-[14px] leading-6 text-slate-100">{value || "—"}</div>
    </div>
  );
}

function HistoryItem({
  entry,
  index,
}: {
  entry: HistoryEntry;
  index: number;
}) {
  const parsed = splitUserBlock(entry.user);

  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[0.022] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15px] font-semibold text-sky-100">Ответ агента #{index + 1}</div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300">
            Следующий шаг
          </span>
          {entry.userReply !== "не требуется" && (
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300">
              Есть ответ пользователю
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {parsed.doneText ? <HistoryBlock label="Что уже сделано" value={parsed.doneText} /> : null}
        {parsed.consultantComment ? (
          <HistoryBlock label="Комментарий консультанта" value={parsed.consultantComment} />
        ) : null}

        <HistoryBlock label="Следующий шаг" value={entry.nextStep} />
        <HistoryBlock label="Ответ пользователю" value={entry.userReply} />
        <HistoryBlock label="Комментарий в таску" value={entry.taskComment} />
        <HistoryBlock label="Риск" value={entry.risk} />
      </div>
    </div>
  );
}

function ExpandableTicketText({
  text,
}: {
  text: string;
}) {
  const fullText = text || "Текст тикета не заполнен";
  const previewLength = 220;
  const shouldCollapse = fullText.length > previewLength;
  const previewText = shouldCollapse ? fullText.slice(0, previewLength).trimEnd() : fullText;
  const restText = shouldCollapse ? fullText.slice(previewLength).trimStart() : "";

  return (
    <details className="group mt-2 w-full rounded-xl border border-white/8 bg-white/[0.022] open:bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[13px] text-slate-300 marker:hidden">
        <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
          {previewText}
          {shouldCollapse ? "…" : ""}
        </span>

        {shouldCollapse ? (
          <>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300 group-open:hidden">
              Развернуть
            </span>
            <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300 group-open:inline-flex">
              Свернуть
            </span>
          </>
        ) : null}
      </summary>

      {shouldCollapse ? (
        <div className="border-t border-white/8 px-3 py-3 text-[13px] leading-6 text-slate-100 whitespace-pre-wrap break-words">
          {restText}
        </div>
      ) : null}
    </details>
  );
}

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTaskId, setNewTaskId] = useState("");
  const [newTicketText, setNewTicketText] = useState("");
  const [newDoneText, setNewDoneText] = useState("");
  const [newConsultantComment, setNewConsultantComment] = useState("");

  const [updateTicketText, setUpdateTicketText] = useState("");
  const [updateDoneText, setUpdateDoneText] = useState("");
  const [updateConsultantComment, setUpdateConsultantComment] = useState("");

  async function fetchTasks(preferredId?: string | null) {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/tasks`, { cache: "no-store" });
      if (!res.ok) throw new Error("Не удалось получить задачи");
      const data: Task[] = await res.json();
      setTasks(data);

      const nextId =
        preferredId && data.some((t) => t.id === preferredId)
          ? preferredId
          : selectedTaskId && data.some((t) => t.id === selectedTaskId)
          ? selectedTaskId
          : data[0]?.id ?? null;

      setSelectedTaskId(nextId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (showArchived) {
      setStatusFilter("Все");
    }
  }, [showArchived]);

  const activeTasks = tasks.filter((t) => !t.archived);
  const archivedTasks = tasks.filter((t) => t.archived);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      if (!showArchived && task.archived) return false;
      if (showArchived && !task.archived) return false;

      if (!showArchived && statusFilter !== "Все" && task.state.status !== statusFilter) return false;

      if (!query) return true;

      return (
        task.id.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.ticketText.toLowerCase().includes(query)
      );
    });
  }, [tasks, search, showArchived, statusFilter]);

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) || filteredTasks[0] || activeTasks[0] || null;

  useEffect(() => {
    if (!selectedTask) return;
    setUpdateTicketText(selectedTask.ticketText || "");
    setUpdateDoneText("");
    setUpdateConsultantComment("");
  }, [selectedTask?.id]);

  async function createTaskAndRunAgent() {
    const taskId = newTaskId.trim();
    if (!taskId) {
      setError("Нужно указать id задачи");
      return;
    }

    try {
      setError("");
      setIsCreating(true);

      const payload: CreateTaskPayload = {
        id: taskId,
        ticketText: newTicketText.trim(),
        doneText: newDoneText.trim(),
        consultantComment: newConsultantComment.trim(),
      };

      const createRes = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => null);
        throw new Error(body?.detail || "Не удалось создать задачу");
      }

      const createdTask: Task = await createRes.json();

      setTasks((prev) => [createdTask, ...prev]);
      setSelectedTaskId(createdTask.id);
      setCreateOpen(false);

      setUpdateTicketText(createdTask.ticketText || "");
      setUpdateDoneText("");
      setUpdateConsultantComment("");

      if (payload.ticketText || payload.doneText || payload.consultantComment) {
        setIsRunningAgent(true);

        const agentRes = await fetch(`${API_BASE}/tasks/${createdTask.id}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketText: payload.ticketText,
            doneText: payload.doneText,
            consultantComment: payload.consultantComment,
          }),
        });

        if (!agentRes.ok) {
          const body = await agentRes.json().catch(() => null);
          throw new Error(body?.detail || "Не удалось запустить агента после создания");
        }

        const agentData = await agentRes.json();
        const updatedTask: Task = agentData.task;

        setTasks((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
        setSelectedTaskId(updatedTask.id);
      }

      setNewTaskId("");
      setNewTicketText("");
      setNewDoneText("");
      setNewConsultantComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания задачи");
    } finally {
      setIsCreating(false);
      setIsRunningAgent(false);
    }
  }

  async function runAgentOnSelectedTask() {
    if (!selectedTask) return;

    try {
      setError("");
      setIsRunningAgent(true);

      const payload: AgentPayload = {
        ticketText: updateTicketText.trim(),
        doneText: updateDoneText.trim(),
        consultantComment: updateConsultantComment.trim(),
      };

      const res = await fetch(`${API_BASE}/tasks/${selectedTask.id}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Не удалось отправить обновление");
      }

      const data = await res.json();
      const updatedTask: Task = data.task;

      setTasks((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
      setSelectedTaskId(updatedTask.id);

      setUpdateDoneText("");
      setUpdateConsultantComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления");
    } finally {
      setIsRunningAgent(false);
    }
  }

  async function deleteTask(taskId: string) {
    const confirmed = window.confirm(`Удалить задачу ${taskId}?`);
    if (!confirmed) return;

    try {
      setError("");

      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Не удалось удалить задачу");
      }

      const nextTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(nextTasks);

      if (selectedTaskId === taskId) {
        setSelectedTaskId(nextTasks[0]?.id ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  async function toggleArchiveTask(task: Task) {
    try {
      setError("");

      const res = await fetch(`${API_BASE}/tasks/${task.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !task.archived }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Не удалось изменить архивный статус");
      }

      const updatedTask: Task = await res.json();

      setTasks((prev) => prev.map((item) => (item.id === updatedTask.id ? updatedTask : item)));

      if (!updatedTask.archived) {
        setShowArchived(false);
        setSelectedTaskId(updatedTask.id);
      } else if (!showArchived && selectedTaskId === updatedTask.id) {
        const nextActive = tasks.find((t) => t.id !== updatedTask.id && !t.archived);
        setSelectedTaskId(nextActive?.id ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка архивации");
    }
  }

  const selectedStatusTone = selectedTask
    ? statusToneMap[selectedTask.state.status] || "border-slate-600/80 bg-slate-500/10 text-slate-200"
    : "border-slate-600/80 bg-slate-500/10 text-slate-200";

  return (
    <main className="min-h-screen bg-[#03111f] text-slate-100">
      <div className="mx-auto max-w-[1520px] px-4 py-4">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] leading-none font-bold tracking-[-0.03em] text-white">MWS AI</h1>
            <p className="mt-1 text-[13px] text-slate-400">Рабочий агент по задачам Directum RX</p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] font-medium text-white transition hover:bg-white/[0.06]"
          >
            + Новая таска
          </button>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="mb-4 rounded-[18px] border border-white/8 bg-[#061427]/92 px-4 py-3 shadow-[0_10px_30px_rgba(2,8,23,0.22)]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowArchived(false)}
                  className={cn(
                    "h-8 rounded-xl border px-3 text-[13px] transition",
                    !showArchived
                      ? "border-white/14 bg-white/[0.06] text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                  )}
                >
                  Все таски ({activeTasks.length})
                </button>

                <button
                  onClick={() => setShowArchived(true)}
                  className={cn(
                    "h-8 rounded-xl border px-3 text-[13px] transition",
                    showArchived
                      ? "border-white/14 bg-white/[0.06] text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                  )}
                >
                  Архив ({archivedTasks.length})
                </button>
              </div>

              <div className="w-full max-w-[360px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по номеру, названию или тексту"
                  className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[14px] text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                />
              </div>
            </div>

            {!showArchived ? (
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition",
                      statusFilter === status
                        ? status === "Все"
                          ? "border-white/14 bg-white/[0.06] text-white"
                          : statusToneMap[status]
                        : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <SectionCard
              title="Список задач"
              compact
              action={
                <button
                  onClick={() => fetchTasks(selectedTaskId)}
                  className="h-8 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[12px] text-slate-300 hover:bg-white/[0.05]"
                >
                  Обновить
                </button>
              }
            >
              <div className="mb-3 text-[12px] text-slate-500">
                {filteredTasks.length} {filteredTasks.length === 1 ? "задача" : "задач"}
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
                    Загрузка...
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-400">
                    Здесь пока пусто
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const active = task.id === selectedTask?.id;
                    const tone =
                      statusToneMap[task.state.status] || "border-slate-600/80 bg-slate-500/10 text-slate-200";

                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={cn(
                          "w-full rounded-[16px] border px-3 py-2.5 text-left transition",
                          active
                            ? "border-blue-500/30 bg-blue-500/[0.07]"
                            : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn("text-[12px] font-medium", active ? "text-sky-200" : "text-slate-400")}>
                            {task.id}
                          </span>

                          <span
                            className={cn(
                              "max-w-[120px] shrink-0 truncate rounded-full border px-2 py-0.5 text-[10px]",
                              tone
                            )}
                            title={task.state.status}
                          >
                            {task.state.status}
                          </span>
                        </div>

                        <div className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-white">
                          {compactText(task.title, 54)}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>{task.history.length > 0 ? `Ответов: ${task.history.length}` : "Без ответа"}</span>
                          <span className="truncate">{formatDate(task.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </aside>

          <section className="space-y-4">
            {selectedTask ? (
              <>
                <SectionCard compact>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-slate-300">
                            {selectedTask.id}
                          </span>
                          <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", selectedStatusTone)}>
                            {selectedTask.state.status}
                          </span>
                        </div>

                        <h2 className="mt-2 text-[17px] leading-6 font-semibold tracking-[-0.02em] text-white">
                          {compactText(selectedTask.title, 110)}
                        </h2>

                        <ExpandableTicketText text={selectedTask.ticketText} />
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          onClick={() => toggleArchiveTask(selectedTask)}
                          className="h-8 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[12px] text-slate-200 hover:bg-white/[0.05]"
                        >
                          {selectedTask.archived ? "Вернуть" : "В архив"}
                        </button>

                        <button
                          onClick={() => deleteTask(selectedTask.id)}
                          className="h-8 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-[12px] text-red-200 hover:bg-red-500/15"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <MetaField label="Тип" value={selectedTask.state.type || "—"} />
                      <MetaField label="Приоритет" value={selectedTask.state.priority || "—"} />
                      <MetaField label="Подрядчик" value={selectedTask.state.contractor || "—"} />
                      <MetaField label="Обновлено" value={formatDate(selectedTask.updatedAt)} />
                    </div>

                    {selectedTask.state.risk && selectedTask.state.risk !== "не требуется" ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-amber-300/80">Риск</div>
                        <div className="mt-1 text-[13px] text-amber-100">{selectedTask.state.risk}</div>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.15fr)_390px]">
                  <div className="space-y-4">
                    <SectionCard
                      title="Что проверить самой"
                      compact
                      action={
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300">
                          {selectedTask.state.checks?.length ?? 0}
                        </span>
                      }
                    >
                      <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
                        {selectedTask.state.checks?.length ? (
                          <ul className="space-y-1.5 text-[14px] leading-6 text-slate-100">
                            {selectedTask.state.checks.map((item, index) => (
                              <li key={`${item}-${index}`} className="flex gap-2.5">
                                <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-sky-300" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-[14px] text-slate-400">не требуется</div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title="История" compact>
                      {selectedTask.history.length === 0 ? (
                        <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-[14px] text-slate-400">
                          Пока нет ответов агента. После создания задачи первый ответ должен появляться автоматически.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {[...selectedTask.history]
                            .slice()
                            .reverse()
                            .map((entry, index) => (
                              <HistoryItem
                                key={entry.id}
                                entry={entry}
                                index={selectedTask.history.length - 1 - index}
                              />
                            ))}
                        </div>
                      )}
                    </SectionCard>
                  </div>

                  <div className="space-y-4">
                    <SectionCard title="Новый апдейт" compact>
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1.5 text-[14px] font-medium text-sky-100">Что пришло от пользователя</div>
                          <textarea
                            value={updateTicketText}
                            onChange={(e) => setUpdateTicketText(e.target.value)}
                            rows={5}
                            className="w-full rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                          />
                        </div>

                        <div>
                          <div className="mb-1.5 text-[14px] font-medium text-emerald-200">
                            Что уже сделано консультантом
                          </div>
                          <textarea
                            value={updateDoneText}
                            onChange={(e) => setUpdateDoneText(e.target.value)}
                            rows={4}
                            placeholder="Только подтверждённые действия и факты"
                            className="w-full rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                          />
                        </div>

                        <div>
                          <div className="mb-1.5 text-[14px] font-medium text-violet-200">Твой комментарий / гипотеза</div>
                          <textarea
                            value={updateConsultantComment}
                            onChange={(e) => setUpdateConsultantComment(e.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={runAgentOnSelectedTask}
                            disabled={isRunningAgent}
                            className="h-9 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[14px] font-medium text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isRunningAgent ? "Отправляю..." : "Отправить"}
                          </button>

                          <button
                            onClick={() => {
                              setUpdateDoneText("");
                              setUpdateConsultantComment("");
                            }}
                            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-slate-200 hover:bg-white/[0.05]"
                          >
                            Очистить
                          </button>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                </div>
              </>
            ) : (
              <SectionCard title="Нет выбранной задачи" compact>
                <div className="text-[14px] text-slate-400">Создай новую задачу или выбери существующую слева.</div>
              </SectionCard>
            )}
          </section>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl rounded-[24px] border border-white/10 bg-[#061427] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-white">Новая задача</h2>
                <p className="mt-1 text-sm text-slate-400">
                  После создания первый ответ агента запустится автоматически.
                </p>
              </div>

              <button
                onClick={() => setCreateOpen(false)}
                className="h-8 rounded-full border border-white/10 px-3 text-slate-300 hover:bg-white/[0.04]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium text-sky-100">ID задачи</div>
                <input
                  value={newTaskId}
                  onChange={(e) => setNewTaskId(e.target.value)}
                  placeholder="Например, DIR-1453"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-sky-100">Что пришло от пользователя</div>
                <textarea
                  value={newTicketText}
                  onChange={(e) => setNewTicketText(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-emerald-200">Что уже сделано</div>
                <textarea
                  value={newDoneText}
                  onChange={(e) => setNewDoneText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-violet-200">Комментарий консультанта</div>
                <textarea
                  value={newConsultantComment}
                  onChange={(e) => setNewConsultantComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] leading-6 text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={createTaskAndRunAgent}
                  disabled={isCreating || isRunningAgent}
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.06] px-5 text-[14px] font-medium text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating || isRunningAgent ? "Создаю..." : "Создать задачу"}
                </button>

                <button
                  onClick={() => setCreateOpen(false)}
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[14px] text-slate-200 hover:bg-white/[0.05]"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}