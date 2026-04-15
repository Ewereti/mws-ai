export async function getTasks() {
  const res = await fetch("http://127.0.0.1:8000/tasks", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Не удалось загрузить задачи");
  }

  return res.json();
}