/* eslint-env browser */
// Front mínimo que consume la API (misma origin)

const $ = (sel) => document.querySelector(sel);

// Helper: fetch con JSON y manejo de errores
async function apiJson(path, init = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})); 
    const msg = data.error || res.statusText || "Error";
    throw new Error(`${res.status} ${msg}`);
  }

  if (res.status === 204) return null; // DELETE sin body
  return res.json();
}


async function cargarHealth() {
  try {
    const h = await apiJson("/health");
    const ok = h?.status === "ok" ? "OK" : "FAIL";
    $("#health").textContent = `/health: ${ok}`;
    $("#health").className = `badge ${ok === "OK" ? "ok" : "fail"}`;
  } catch {
    $("#health").textContent = "/health: FAIL";
    $("#health").className = "badge fail";
  }
}

async function cargarLista() {
  const ul = $("#lista");
  ul.innerHTML = "<li>Cargando…</li>";
  try {
    const data = await apiJson("/todos");
    ul.innerHTML = "";
    if (!data.length) {
      const li = document.createElement("li");
      li.textContent = "No hay tareas todavía.";
      ul.appendChild(li);
      return;
    }
    for (const t of data) {
      const li = document.createElement("li");
      li.innerHTML = `
        <label>
          <input type="checkbox" ${t.done ? "checked" : ""} data-id="${t.id}" class="toggle" />
          <span class="${t.done ? "done" : ""}">${t.title}</span>
        </label>
        <button class="del" data-id="${t.id}" title="Borrar">🗑️</button>
      `;
      ul.appendChild(li);
    }
  } catch (err) {
    ul.innerHTML = `<li style="color:#c62828">Error: ${err.message}</li>`;
  }
}

async function crearTodo(title) {
  await apiJson("/todos", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

async function actualizarTodo(id, patch) {
  await apiJson(`/todos/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

async function borrarTodo(id) {
  await apiJson(`/todos/${id}`, { method: "DELETE" });
}

document.addEventListener("DOMContentLoaded", () => {
  cargarHealth();
  cargarLista();

  $("#form-nuevo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#title").value.trim();
    if (!title) return;
    try {
      await crearTodo(title);
      $("#title").value = "";
      await cargarLista();
    } catch (err) {
      alert("Error al crear: " + err.message);
    }
  });

  $("#lista").addEventListener("change", async (e) => {
    if (e.target.classList.contains("toggle")) {
      const id = e.target.getAttribute("data-id");
      try {
        await actualizarTodo(id, { done: e.target.checked });
        await cargarLista();
      } catch (err) {
        alert("Error al actualizar: " + err.message);
      }
    }
  });

  $("#lista").addEventListener("click", async (e) => {
    if (e.target.classList.contains("del")) {
      const id = e.target.getAttribute("data-id");
      if (confirm("¿Borrar TODO #" + id + "?")) {
        try {
          await borrarTodo(id);
          await cargarLista();
        } catch (err) {
          alert("Error al borrar: " + err.message);
        }
      }
    }
  });
});
