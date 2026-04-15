"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Search, AlertTriangle, User, Send, ClipboardList, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const seedTasks = [
  {
    id: "DIR-1401",
    title: "Архивная задача по маршруту отпуска",
    status: "Решено",
    type: "Консультация",
    priority: "Средний",
    contractor: "не требуется",
    risk: "не требуется",
    archived: true,
    ticketText: "Нужно было проверить, почему сотрудник не видит заявление на отпуск.",
    doneText: "Проверена настройка прав и фильтров отображения.",
    consultantComment: "Проблема была в пользовательском фильтре.",
    checks: ["не требуется"],
    history: [],
  },
  {
    id: "DIR-1436",
    title: "Протестировать изменение приёма",
    status: "В работе",
    type: "Консультация",
    priority: "Средний",
    contractor: "не требуется",
    risk: "не требуется",
    ticketText: "Необходимо протестировать изменение приёма согласно инструкции от вендора.",
    doneText: "Инструкция прочитана, вариант процесса настроен на тестовом контуре.",
    consultantComment: "Нужно прогнать сценарии и понять, требуется ли ответ пользователю.",
    checks: [
      "Прогнать тестовые сценарии из инструкции на тестовом контуре",
      "Проверить логи и результат выполнения для каждого сценария",
      "Зафиксировать результаты: скриншоты и собранные логи",
    ],
    history: [
      {
        id: 1,
        user: "Первичный разбор таски",
        nextStep: "Выполнить тестирование на тестовом контуре по инструкции вендора.",
        userReply: "Привет. Запускаю тестирование изменения приёма на тестовом контуре по инструкции вендора.",
        taskComment: "Вариант процесса настроен на тестовом контуре, приступаю к прогону тестовых сценариев и фиксации результатов.",
        risk: "не требуется",
      },
    ],
  },
  {
    id: "DIR-1428",
    title: "Рассчитать функционального руководителя по заказчику",
    status: "Ожидание ответа пользователя",
    type: "Настройка",
    priority: "Средний",
    contractor: "не требуется",
    risk: "не требуется",
    ticketText: "Нужно определить, кто должен подставляться функциональным руководителем по заказчику.",
    doneText: "Проверила текущую настройку и логику подстановки.",
    consultantComment: "Жду подтверждение, кого считать функциональным руководителем в спорном кейсе.",
    checks: ["не требуется"],
    history: [],
    archived: false,
  },
  {
    id: "DIR-1424",
    title: "Процесс согласования в Директуме",
    status: "В работе",
    type: "Консультация",
    priority: "Средний",
    contractor: "пока рано",
    risk: "Изменение этапов может повлиять на порядок согласования.",
    ticketText: "Нужно помочь отстроить последовательность согласования по закупкам и договорам.",
    doneText: "Собраны примеры ошибочной маршрутизации.",
    consultantComment: "Похоже, что часть проблем вызвана непрозрачной логикой этапов.",
    checks: [
      "Проверить текущие варианты процесса",
      "Сопоставить порядок согласующих с ожиданиями бизнеса",
    ],
    history: [],
    archived: false,
  },
];

const statusTone = {
  "В работе": "bg-blue-500/15 text-blue-100 border-blue-400/25",
  "Ожидание ответа пользователя": "bg-amber-500/15 text-amber-100 border-amber-400/25",
  "Решено": "bg-emerald-500/15 text-emerald-100 border-emerald-400/25",
  "Новая": "bg-slate-500/15 text-slate-100 border-slate-400/20",
};

function SmallLabel({ children }) {
  return <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">{children}</div>;
}

function TaskRow({ task, active, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-blue-400/40 bg-blue-500/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="shrink-0 text-sm font-semibold text-slate-100">{task.id}</div>
            <div className="min-w-0 truncate text-sm text-white">{task.title}</div>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusTone[task.status] || "border-white/10 bg-white/[0.06] text-slate-100"}`}>
          {task.status}
        </Badge>
      </div>
    </button>
  );
}

function TopTaskTabs({ tabs, activeId, onSelect, onClose, onShowList }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onShowList}
        className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
          !activeId ? "border-blue-400/40 bg-blue-500/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]"
        }`}
      >
        Все таски
      </button>

      {tabs.map((task) => (
        <div
          key={task.id}
          className={`flex items-center gap-1 rounded-2xl border px-3 py-2 ${
            activeId === task.id ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <button onClick={() => onSelect(task.id)} className="max-w-[240px] truncate text-sm font-medium text-white">
            {task.id} · {task.title}
          </button>
          <button
            onClick={() => onClose(task.id)}
            className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label={`Закрыть ${task.id}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function TaskWorkspace({ task, onAppendHistory }) {
  const [ticket, setTicket] = useState("");
  const [done, setDone] = useState("");
  const [comment, setComment] = useState("");

  const submitUpdate = () => {
    if (!ticket.trim() && !done.trim() && !comment.trim()) return;
    onAppendHistory(task.id, {
      id: Date.now(),
      user: [ticket && `Текст тикета: ${ticket}`, done && `Что уже сделано: ${done}`, comment && `Комментарий консультанта: ${comment}`]
        .filter(Boolean)
        .join("\n"),
      nextStep: "Следующий шаг будет рассчитан агентом после отправки на backend.",
      userReply: "Здесь позже будет текст ответа пользователю из backend.",
      taskComment: "Здесь позже будет рабочий комментарий в таску из backend.",
      risk: "не требуется",
    });
    setTicket("");
    setDone("");
    setComment("");
  };

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-300">{task.id}</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{task.title}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-100">Тип: {task.type}</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-100">Приоритет: {task.priority}</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-slate-100">Подрядчик: {task.contractor}</Badge>
              </div>
            </div>
            <Badge variant="outline" className={statusTone[task.status] || "border-white/10 bg-white/[0.06] text-slate-100"}>
              {task.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-white/[0.04] p-1">
          <TabsTrigger value="overview" className="rounded-xl text-slate-100">Обзор</TabsTrigger>
          <TabsTrigger value="context" className="rounded-xl text-slate-100">Контекст</TabsTrigger>
          <TabsTrigger value="work" className="rounded-xl text-slate-100">Диалог и обновление</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[1.35fr_0.75fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">Что проверить</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <SmallLabel>Тип задачи</SmallLabel>
                    <div className="mt-1 text-sm font-semibold text-white">{task.type}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <SmallLabel>Приоритет</SmallLabel>
                    <div className="mt-1 text-sm font-semibold text-white">{task.priority}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <SmallLabel>Статус</SmallLabel>
                    <div className="mt-1 text-sm font-semibold text-white">{task.status}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <SmallLabel>Что проверить самой</SmallLabel>
                    <div className="text-xs text-slate-400">{task.checks.length} пункта</div>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-100">
                    {task.checks.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-white"><AlertTriangle className="h-4 w-4" /> Риск</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-6 text-slate-100">{task.risk}</CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-white"><User className="h-4 w-4" /> Подрядчик</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm leading-6 text-slate-100">{task.contractor}</CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="context">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-white">Контекст задачи</CardTitle>
              <CardDescription className="text-slate-400">Более читаемый линейный формат вместо трёх одинаковых плиток.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <SmallLabel>Текст тикета</SmallLabel>
                    <div className="mt-1 text-sm text-slate-400">Что пришло от пользователя или инициатора</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Источник</div>
                </div>
                <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-100">{task.ticketText || "—"}</div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <SmallLabel>Что уже сделано</SmallLabel>
                      <div className="mt-1 text-sm text-slate-400">Подтверждённые действия консультанта</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Факты</div>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-100">{task.doneText || "—"}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <SmallLabel>Комментарий консультанта</SmallLabel>
                      <div className="mt-1 text-sm text-slate-400">Мысли, гипотеза, что смущает</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Контекст</div>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap leading-7 text-slate-100">{task.consultantComment || "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work">
          <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-white">История</CardTitle>
                <CardDescription className="text-slate-400">Одна таска — один отдельный рабочий диалог</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] pr-4">
                  <div className="space-y-4">
                    {task.history.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold text-white">Сообщение</div>
                          <div className="text-sm text-slate-400">История по одной таске</div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 md:col-span-2 xl:col-span-4">
                            <SmallLabel>Что ты написала</SmallLabel>
                            <div className="mt-2 whitespace-pre-wrap text-slate-100">{item.user}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <SmallLabel>Следующий шаг</SmallLabel>
                            <div className="mt-2 whitespace-pre-wrap text-slate-100">{item.nextStep}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <SmallLabel>Ответ пользователю</SmallLabel>
                            <div className="mt-2 whitespace-pre-wrap text-slate-100">{item.userReply}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <SmallLabel>Комментарий в таску</SmallLabel>
                            <div className="mt-2 whitespace-pre-wrap text-slate-100">{item.taskComment}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <SmallLabel>Риск</SmallLabel>
                            <div className="mt-2 whitespace-pre-wrap text-slate-100">{item.risk}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="text-white">Новый апдейт</CardTitle>
                <CardDescription className="text-slate-400">Разделяй текст пользователя, сделанные шаги и свою гипотезу</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  1. Что пришло от пользователя сейчас<br />2. Что ты уже сделала<br />3. Что ты думаешь или что смущает
                </div>
                <Textarea value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="Сообщение пользователя / новый текст тикета" className="min-h-[120px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                <Textarea value={done} onChange={(e) => setDone(e.target.value)} placeholder="Что уже сделано консультантом" className="min-h-[110px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Твой комментарий / гипотеза" className="min-h-[110px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                <div className="flex gap-3">
                  <Button onClick={submitUpdate} className="flex-1 rounded-2xl"><Send className="mr-2 h-4 w-4" />Отправить обновление</Button>
                  <Button variant="outline" className="rounded-2xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">Очистить</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MwsAgentReactPrototype() {
  const [tasks, setTasks] = useState(seedTasks);
  const [statusFilter, setStatusFilter] = useState("Все");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [openTaskIds, setOpenTaskIds] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ id: "", ticketText: "", doneText: "", consultantComment: "" });
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((task) => !task.archived), [tasks]);

  const archivedTasks = useMemo(() => tasks.filter((task) => task.archived), [tasks]);

  const filteredTasks = useMemo(() => {
    return activeTasks.filter((task) => {
      const statusOk = statusFilter === "Все" || task.status === statusFilter;
      const search = `${task.id} ${task.title}`.toLowerCase();
      const queryOk = !query.trim() || search.includes(query.toLowerCase());
      return statusOk && queryOk;
    });
  }, [activeTasks, statusFilter, query]);

  const openTabs = tasks.filter((task) => openTaskIds.includes(task.id));
  const activeTask = tasks.find((task) => task.id === activeTaskId) || null;

  const openTask = (taskId) => {
    setOpenTaskIds((prev) => (prev.includes(taskId) ? prev : [...prev, taskId]));
    setActiveTaskId(taskId);
  };

  const closeTask = (taskId) => {
    setOpenTaskIds((prev) => prev.filter((id) => id !== taskId));
    if (activeTaskId === taskId) {
      const rest = openTaskIds.filter((id) => id !== taskId);
      setActiveTaskId(rest.length ? rest[rest.length - 1] : "");
    }
  };

  const showTaskList = () => setActiveTaskId("");

  const createTask = () => {
    if (!newTask.id.trim()) return;
    const task = {
      id: newTask.id.trim(),
      archived: false,
      title: newTask.ticketText.trim() || "Новая задача",
      status: "Новая",
      type: "—",
      priority: "—",
      contractor: "не требуется",
      risk: "не требуется",
      ticketText: newTask.ticketText.trim(),
      doneText: newTask.doneText.trim(),
      consultantComment: newTask.consultantComment.trim(),
      checks: ["не требуется"],
      history: [],
    };
    setTasks((prev) => [task, ...prev]);
    setNewTask({ id: "", ticketText: "", doneText: "", consultantComment: "" });
    setCreateOpen(false);
    openTask(task.id);
  };

  const appendHistory = (taskId, entry) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, history: [...task.history, entry] } : task)));
  };

  const statuses = ["Все", ...Array.from(new Set(activeTasks.map((task) => task.status)))];

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">MWS AI — Рабочий агент</h1>
              <p className="mt-2 text-slate-400">Список задач и рабочая область объединены в верхнюю полосу вкладок.</p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl px-6 py-6 text-base"><Plus className="mr-2 h-5 w-5" />Новая таска</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl border-white/10 bg-[#0c1728] text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Новая таска</DialogTitle>
                  <DialogDescription className="text-slate-400">Заполни исходные данные. После создания таска сразу откроется новой вкладкой рядом с «Все таски».</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Номер таски, например DIR-1501" value={newTask.id} onChange={(e) => setNewTask((s) => ({ ...s, id: e.target.value }))} className="rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                  <Textarea placeholder="Текст тикета" value={newTask.ticketText} onChange={(e) => setNewTask((s) => ({ ...s, ticketText: e.target.value }))} className="min-h-[120px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                  <Textarea placeholder="Что уже сделано" value={newTask.doneText} onChange={(e) => setNewTask((s) => ({ ...s, doneText: e.target.value }))} className="min-h-[100px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                  <Textarea placeholder="Комментарий консультанта" value={newTask.consultantComment} onChange={(e) => setNewTask((s) => ({ ...s, consultantComment: e.target.value }))} className="min-h-[100px] rounded-2xl border-white/10 bg-white/[0.03] text-white placeholder:text-slate-500" />
                  <Button onClick={createTask} className="w-full rounded-2xl">Создать таску</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            <TopTaskTabs tabs={openTabs} activeId={activeTaskId} onSelect={setActiveTaskId} onClose={closeTask} onShowList={showTaskList} />

            {!activeTask ? (
              <div className="space-y-4">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="relative w-full xl:max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Поиск по номеру или названию"
                          className="rounded-2xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {statuses.map((status) => (
                          <Button
                            key={status}
                            variant={statusFilter === status ? "default" : "outline"}
                            onClick={() => setStatusFilter(status)}
                            className={`h-9 rounded-2xl px-4 ${statusFilter !== status ? "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]" : ""}`}
                          >
                            {status}
                            <span className="ml-2 text-xs opacity-80">({status === "Все" ? activeTasks.length : activeTasks.filter((t) => t.status === status).length})</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white"><ClipboardList className="h-4 w-4" /> Все таски</CardTitle>
                    <CardDescription className="text-slate-400">Список компактный, в один столбец. Нажми по самой задаче, чтобы открыть её новой вкладкой.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {filteredTasks.map((task) => (
                        <TaskRow key={task.id} task={task} active={openTaskIds.includes(task.id)} onOpen={() => openTask(task.id)} />
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <button
                        onClick={() => setArchiveOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-slate-300">
                            {archiveOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">Архивные таски</div>
                            <div className="mt-1 text-sm text-slate-400">Решённые и убранные из активной работы задачи</div>
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{archivedTasks.length}</div>
                      </button>

                      {archiveOpen && (
                        archivedTasks.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {archivedTasks.map((task) => (
                              <TaskRow key={task.id} task={task} active={openTaskIds.includes(task.id)} onOpen={() => openTask(task.id)} />
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 text-sm text-slate-500">Архив пуст</div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <TaskWorkspace task={activeTask} onAppendHistory={appendHistory} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
