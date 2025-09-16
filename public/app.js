// Front mínimo que consume la API
const $ = sel => document.querySelector(sel)
const api = (path, init) => fetch(path, { headers: { "Content-Type": "application/json" }, ...init })

async function cargarHealth () {
  try {
    const r = await api("/health")
    const ok = r.ok ? "OK" : "FAIL"
    $("#health").textContent = `/health: ${ok}`
    $("#health").className = `badge ${ok === "OK" ? "ok" : "fail"}`
  } catch {
    $("#health").textContent = "/health: FAIL"
    $("#health").className = "badge fail"
  }
}

async function cargarLista () {
  const ul = $("#lista")
  ul.innerHTML = "<li>Cargando…</li>"
  const r = await api("/todos")
  const data = await r.json()
  ul.innerHTML = ""
  for (const t of data) {
    const li = document.createElement("li")
    li.innerHTML = `
      <label>
        <input type="checkbox" ${t.done ? "checked" : ""} data-id="${t.id}" class="toggle" />
        <span class="${t.done ? "done" : ""}">${t.title}</span>
      </label>
      <button class="del" data-id="${t.id}" title="Borrar">🗑️</button>
    `
    ul.appendChild(li)
  }
}

async function crearTodo (title) {
  const r = await api("/todos", {
    method: "POST",
    body: JSON.stringify({ title })
  })
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    alert("Error: " + (e.error || r.statusText))
  }
}

async function actualizarTodo (id, patch) {
  await api("/todos/" + id, { method: "PUT", body: JSON.stringify(patch) })
}

async function borrarTodo (id) {
  await api("/todos/" + id, { method: "DELETE" })
}

document.addEventListener("DOMContentLoaded", () => {
  cargarHealth()
  cargarLista()

  $("#form-nuevo").addEventListener("submit", async (e) => {
    e.preventDefault()
    const title = $("#title").value.trim()
    if (!title) return
    await crearTodo(title)
    $("#title").value = ""
    await cargarLista()
  })

  $("#lista").addEventListener("change", async (e) => {
    if (e.target.classList.contains("toggle")) {
      const id = e.target.getAttribute("data-id")
      await actualizarTodo(id, { done: e.target.checked })
      await cargarLista()
    }
  })

  $("#lista").addEventListener("click", async (e) => {
    if (e.target.classList.contains("del")) {
      const id = e.target.getAttribute("data-id")
      if (confirm("¿Borrar TODO #" + id + "?")) {
        await borrarTodo(id)
        await cargarLista()
      }
    }
  })
})
