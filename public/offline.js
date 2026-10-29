document
  .getElementById("reload")
  .addEventListener("click", () => location.reload());
(async () => {
  const status = document.getElementById("status");
  try {
    if (navigator.onLine) {
      status.textContent =
        "Vuelve a tu espacio para consultar la agenda actualizada.";
      return;
    }
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("luisa-private-agenda", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("private");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const saved = await new Promise((resolve, reject) => {
      const r = db.transaction("private").objectStore("private").get("agenda");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (!saved) throw new Error("empty");
    const decoded = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: saved.iv },
      saved.key,
      saved.encrypted,
    );
    const snapshot = JSON.parse(new TextDecoder().decode(decoded));
    if (Date.now() > snapshot.expiresAt) throw new Error("expired");
    const format = (value, options) =>
      new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        ...options,
      }).format(new Date(value));
    status.textContent = `${snapshot.owner}, esta copia se guardó el ${format(snapshot.savedAt, { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}. Se conserva hasta 12 horas en este dispositivo.`;
    const target = document.getElementById("agenda");
    for (const appointment of snapshot.appointments.sort((a, b) =>
      a.start_at.localeCompare(b.start_at),
    )) {
      const article = document.createElement("article");
      const title = document.createElement("h2");
      title.textContent = appointment.name;
      const date = document.createElement("p");
      date.textContent = format(appointment.start_at, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      });
      const state = document.createElement("p");
      state.className = "meta";
      state.textContent =
        {
          scheduled: "Por confirmar",
          confirmed: "Confirmada",
          completed: "Atendida",
          no_show: "No asistió",
        }[appointment.status] ?? "";
      article.append(title, date, state);
      target.append(article);
    }
    if (!snapshot.appointments.length)
      target.textContent =
        "No tenías citas próximas en la última agenda guardada.";
    db.close();
  } catch {
    status.textContent =
      "No hay una copia reciente disponible. Conéctate a internet y abre tu agenda para actualizarla.";
  }
})();
