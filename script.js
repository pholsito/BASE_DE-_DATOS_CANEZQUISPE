// ============================================================
// ⚙️  CONFIGURACIÓN SUPABASE
// ============================================================
const SUPABASE_URL = "https://vsamooxhskbxwutbpazi.supabase.co";
const SUPABASE_KEY = "sb_publishable_2Ugi7tFSlsS4H7MUbu_37w_Zi9hC8TX";
const STORAGE_BUCKET = "trabajos";

// ============================================================
// 🔐  CREDENCIALES ADMIN
// ============================================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

// ============================================================
// 📋  TEMAS POR SEMANA
// ============================================================
const TEMAS_SEMANAS = {
    1:  "Introducción a la base de datos y conceptos fundamentales.",
    2:  "Gestores de base de datos y modelado de datos.",
    3:  "Diseño de arquitectura de base de datos.",
    4:  "Manejo de Transacciones y Procedimientos Almacenados.",
    5:  "Triggers y Automatización de Procesos en BD.",
    6:  "Normalización y optimización de esquemas.",
    7:  "Consultas avanzadas con SQL.",
    8:  "Índices y rendimiento en bases de datos.",
    9:  "Seguridad y control de acceso en BD.",
    10: "Replicación y respaldo de datos.",
    11: "Bases de datos distribuidas.",
    12: "NoSQL: MongoDB y Redis.",
    13: "Big Data e integración con BD relacionales.",
    14: "Proyecto integrador - Diseño.",
    15: "Proyecto integrador - Implementación.",
    16: "Exposición final y evaluación."
};

// ============================================================
// 🌐  CLIENTE SUPABASE
// ============================================================
const db = {
    async query(method, path, body = null) {
        const opts = {
            method,
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": method === "POST" ? "return=representation" : ""
            }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || err.error || `Error ${res.status}`);
        }
        if (res.status === 204) return null;
        return res.json();
    },
    async get(path) { return this.query("GET", path); },
    async post(path, data) { return this.query("POST", path, data); },
    async delete(path) { return this.query("DELETE", path); },

    async uploadFile(file, ruta) {
        const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${ruta}`,
            {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": file.type,
                    "x-upsert": "true"
                },
                body: file
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || err.message || `Error al subir: ${res.status}`);
        }
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${ruta}`;
    },

    async deleteFile(ruta) {
        const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${ruta}`,
            {
                method: "DELETE",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        return res.ok;
    }
};

// ============================================================
// 🏠  ESTADO GLOBAL
// ============================================================
let trabajos = [];
let adminLogueado = false;
let tipoActual = "archivo";
let archivoSeleccionado = null;

// ============================================================
// 🚀  INICIO
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    crearParticulas();
    inicializarNavbar();
    cargarTrabajos();
    inicializarDropZone();
});

// ============================================================
// ✨  PARTÍCULAS
// ============================================================
function crearParticulas() {
    const cont = document.getElementById("particles");
    if (!cont) return;
    for (let i = 0; i < 40; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.style.cssText = `left:${Math.random()*100}%;width:${Math.random()*3+1}px;height:${Math.random()*3+1}px;animation-duration:${Math.random()*15+8}s;animation-delay:${Math.random()*10}s;`;
        cont.appendChild(p);
    }
}

function inicializarNavbar() {
    window.addEventListener("scroll", () => {
        document.getElementById("navbar")?.classList.toggle("scrolled", window.scrollY > 50);
    });
}
function toggleMenu() {
    document.getElementById("mobileMenu")?.classList.toggle("open");
}

// ============================================================
// 📦  CARGAR TRABAJOS
// ============================================================
async function cargarTrabajos() {
    try {
        const data = await db.get("trabajos?select=*&order=semana,created_at");
        trabajos = data || [];
        renderearSemanas();
        actualizarStats();
        generarFiltros();
    } catch (err) {
        console.error(err);
        trabajos = [];
        renderearSemanas();
        showToast("⚠️ Error al conectar con la BD", "error");
    }
}

// ============================================================
// 🎨  RENDEREAR SEMANAS
// ============================================================
function getIcono(enlace, tipo) {
    if (!enlace || enlace === "#") return "📎";
    const ext = (enlace.split(".").pop().split("?")[0] || "").toLowerCase();
    const mapa = { pdf:"📄", doc:"📝", docx:"📝", ppt:"📊", pptx:"📊", xls:"📈", xlsx:"📈", jpg:"🖼️", png:"🖼️", jpeg:"🖼️", txt:"📃" };
    return mapa[ext] || (tipo === "link" ? "🔗" : "📎");
}

function getLinkVista(enlace) {
    if (!enlace || enlace === "#") return enlace;
    const ext = (enlace.split(".").pop().split("?")[0] || "").toLowerCase();
    if (["doc","docx","ppt","pptx","xls","xlsx"].includes(ext)) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(enlace)}&embedded=false`;
    }
    return enlace;
}

function renderearSemanas() {
    const grid = document.getElementById("gridSemanas");
    if (!grid) return;
    grid.innerHTML = "";

    const mapa = {};
    trabajos.forEach(t => {
        if (!mapa[t.semana]) mapa[t.semana] = [];
        mapa[t.semana].push(t);
    });

    for (let i = 1; i <= 16; i++) {
        const key = `Semana ${i}`;
        const lista = mapa[key] || [];
        const tema = TEMAS_SEMANAS[i] || "Módulo pendiente.";
        const vacia = lista.length === 0;

        const card = document.createElement("div");
        card.className = `semana-card${vacia ? " empty-card" : ""}`;
        card.setAttribute("data-semana", key);

        let tareasHTML = lista.length > 0
            ? lista.map((t, idx) => {
                const icono = getIcono(t.enlace, t.tipo);
                const tieneLink = t.enlace && t.enlace !== "#";
                const linkVista = getLinkVista(t.enlace);
                return `
                <div class="tarea-card">
                    <div class="tarea-tipo-badge">${icono} ${t.tipo === "link" ? "ENLACE" : "ARCHIVO"}</div>
                    <div class="tarea-title">${escapeHTML(t.titulo)}</div>
                    ${tieneLink
                        ? `<div class="tarea-acciones">
                            <a href="${escapeHTML(linkVista)}" target="_blank" rel="noopener" class="tarea-link">👁 Ver</a>
                            <a href="${escapeHTML(t.enlace)}" download target="_blank" rel="noopener" class="tarea-link tarea-dl">⬇ Descargar</a>
                           </div>`
                        : `<span class="tarea-pending">⏳ Pendiente</span>`}
                </div>`;
            }).join("")
            : `<p class="no-tareas">Sin trabajos publicados aún.</p>`;

        card.innerHTML = `
            <div class="semana-header">
                <span class="semana-num${vacia ? " semana-badge-empty" : ""}">SEMANA_${String(i).padStart(2,"0")}</span>
                <span class="semana-count">${lista.length} trabajo${lista.length!==1?"s":""}</span>
            </div>
            <div class="semana-title">${tema.split(".")[0]}</div>
            <div class="semana-desc">${tema}</div>
            <div class="tareas-grid">${tareasHTML}</div>`;

        grid.appendChild(card);
    }
}

// ============================================================
// 📊  STATS + FILTROS
// ============================================================
function actualizarStats() {
    animarContador("statSemanas", [...new Set(trabajos.map(t=>t.semana))].length);
    animarContador("statTrabajos", trabajos.length);
}
function animarContador(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let c = 0;
    const step = Math.max(1, Math.ceil(target/20));
    const t = setInterval(() => { c = Math.min(c+step,target); el.textContent=c; if(c>=target) clearInterval(t); }, 40);
}
function generarFiltros() {
    const cont = document.getElementById("filtrosBtns");
    if (!cont) return;
    const semanas = [...new Set(trabajos.map(t=>t.semana))].sort((a,b)=>parseInt(a.replace("Semana ",""))-parseInt(b.replace("Semana ","")));
    cont.innerHTML = semanas.map(s=>`<button class="filtro-btn" onclick="filtrarSemana('${s}',this)">${s}</button>`).join("");
}
function filtrarSemana(valor, btn) {
    document.querySelectorAll(".filtro-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".semana-card").forEach(c=>{
        c.style.display=(valor==="all"||c.getAttribute("data-semana")===valor)?"":"none";
    });
}

// ============================================================
// 🔐  ADMIN LOGIN
// ============================================================
function abrirAdmin() {
    document.getElementById("modalAdmin")?.classList.add("open");
    mostrarPanel(adminLogueado ? "panelControl" : "panelLogin");
    if (adminLogueado) cargarListaAdmin();
}
function cerrarAdmin(e) {
    if (e && e.target !== document.getElementById("modalAdmin")) return;
    document.getElementById("modalAdmin")?.classList.remove("open");
}
document.addEventListener("keydown", e => {
    if (e.key==="Escape") document.getElementById("modalAdmin")?.classList.remove("open");
});
function mostrarPanel(id) {
    document.getElementById("panelLogin").style.display = id==="panelLogin" ? "" : "none";
    document.getElementById("panelControl").style.display = id==="panelControl" ? "" : "none";
}
function togglePass() {
    const inp = document.getElementById("inputPass");
    if (inp) inp.type = inp.type==="password" ? "text" : "password";
}
function verificarLogin() {
    const user = document.getElementById("inputUser")?.value.trim();
    const pass = document.getElementById("inputPass")?.value;
    const errEl = document.getElementById("loginError");
    if (user===ADMIN_USER && pass===ADMIN_PASS) {
        adminLogueado = true;
        mostrarPanel("panelControl");
        cargarListaAdmin();
        showToast("✅ Bienvenido, Admin", "success");
    } else {
        if (errEl) errEl.textContent = "❌ Usuario o contraseña incorrectos";
        document.getElementById("inputPass").value = "";
        setTimeout(()=>{ if(errEl) errEl.textContent=""; }, 3000);
    }
}
function cerrarSesion() {
    adminLogueado = false;
    document.getElementById("inputUser").value = "";
    document.getElementById("inputPass").value = "";
    document.getElementById("modalAdmin")?.classList.remove("open");
    showToast("👋 Sesión cerrada", "");
}

// ============================================================
// 🗂️  TABS
// ============================================================
function switchTab(tab, btn) {
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tabSubir").style.display = tab==="subir" ? "" : "none";
    document.getElementById("tabLista").style.display = tab==="lista" ? "" : "none";
    if (tab==="lista") cargarListaAdmin();
}

// ============================================================
// 🔀  TIPO SUBIDA
// ============================================================
function setTipo(tipo) {
    tipoActual = tipo;
    document.getElementById("btnTipoArchivo").classList.toggle("active", tipo==="archivo");
    document.getElementById("btnTipoLink").classList.toggle("active", tipo==="link");
    document.getElementById("zonaArchivo").style.display = tipo==="archivo" ? "" : "none";
    document.getElementById("zonaLink").style.display = tipo==="link" ? "" : "none";
}

// ============================================================
// 📂  DROP ZONE
// ============================================================
function inicializarDropZone() {
    const zona = document.getElementById("dropZone");
    const inputFile = document.getElementById("inputFile");
    if (!zona || !inputFile) return;

    zona.addEventListener("dragover", e => { e.preventDefault(); zona.classList.add("drag-over"); });
    zona.addEventListener("dragleave", () => zona.classList.remove("drag-over"));
    zona.addEventListener("drop", e => {
        e.preventDefault();
        zona.classList.remove("drag-over");
        if (e.dataTransfer.files[0]) seleccionarArchivo(e.dataTransfer.files[0]);
    });
    zona.addEventListener("click", () => inputFile.click());
    inputFile.addEventListener("change", e => {
        if (e.target.files[0]) seleccionarArchivo(e.target.files[0]);
    });
}

function seleccionarArchivo(file) {
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
        showToast(`❌ Máximo ${MAX_MB}MB por archivo`, "error");
        return;
    }
    archivoSeleccionado = file;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const iconos = { pdf:"📄", doc:"📝", docx:"📝", ppt:"📊", pptx:"📊", xls:"📈", xlsx:"📈", jpg:"🖼️", png:"🖼️", jpeg:"🖼️", txt:"📃" };
    const icono = iconos[ext] || "📎";
    const sizeMB = (file.size/1024/1024).toFixed(2);
    const preview = document.getElementById("archivoPreview");
    if (preview) {
        preview.innerHTML = `
            <div class="archivo-seleccionado">
                <span style="font-size:2rem">${icono}</span>
                <div class="archivo-datos">
                    <div class="archivo-nombre">${escapeHTML(file.name)}</div>
                    <div class="archivo-meta">.${ext.toUpperCase()} · ${sizeMB} MB</div>
                </div>
                <button onclick="limpiarArchivo()" class="btn-quitar">✕</button>
            </div>`;
    }
    // Auto-rellenar título
    const tituloInput = document.getElementById("admTitulo");
    if (tituloInput && !tituloInput.value.trim()) {
        tituloInput.value = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
    }
}

function limpiarArchivo() {
    archivoSeleccionado = null;
    document.getElementById("archivoPreview").innerHTML = "";
    document.getElementById("inputFile").value = "";
}

// ============================================================
// 📤  SUBIR TRABAJO
// ============================================================
async function subirTrabajo() {
    const semana = document.getElementById("admSemana")?.value;
    const titulo = document.getElementById("admTitulo")?.value.trim();
    const btn = document.getElementById("btnSubir");

    if (!semana) { setUploadMsg("⚠️ Selecciona una semana", "error"); return; }
    if (!titulo) { setUploadMsg("⚠️ Escribe el título", "error"); return; }

    let enlace = "#";

    try {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-sm"></span> Subiendo...`;
        setUploadMsg("", "");

        if (tipoActual === "archivo") {
            if (!archivoSeleccionado) { setUploadMsg("⚠️ Selecciona un archivo primero", "error"); btn.disabled=false; btn.innerHTML="⬆ Publicar Trabajo"; return; }
            setUploadMsg("⬆️ Subiendo archivo a la nube...", "info");
            const ext = archivoSeleccionado.name.split(".").pop();
            const nombre = titulo.replace(/[^a-zA-Z0-9_-]/g,"_");
            const ruta = `${semana.replace(" ","_")}/${nombre}_${Date.now()}.${ext}`;
            enlace = await db.uploadFile(archivoSeleccionado, ruta);
        } else {
            enlace = document.getElementById("admEnlace")?.value.trim() || "#";
            if (!enlace || enlace === "#") { setUploadMsg("⚠️ Ingresa un enlace válido", "error"); return; }
        }

        setUploadMsg("💾 Guardando en base de datos...", "info");
        await db.post("trabajos", { semana, titulo, enlace, tipo: tipoActual });

        setUploadMsg("✅ ¡Publicado! Ya puede verlo cualquier persona.", "success");
        showToast("✅ Trabajo publicado exitosamente", "success");

        // Limpiar
        document.getElementById("admSemana").value = "";
        document.getElementById("admTitulo").value = "";
        if (document.getElementById("admEnlace")) document.getElementById("admEnlace").value = "";
        limpiarArchivo();

        await cargarTrabajos();
        setTimeout(() => setUploadMsg("", ""), 5000);

    } catch (err) {
        console.error(err);
        setUploadMsg(`❌ ${err.message}`, "error");
        showToast("❌ Error al publicar", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "⬆ Publicar Trabajo";
    }
}

function setUploadMsg(msg, type) {
    const el = document.getElementById("uploadMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = `upload-msg ${type||""}`;
}

// ============================================================
// 📋  LISTA ADMIN
// ============================================================
async function cargarListaAdmin() {
    const cont = document.getElementById("listaAdmin");
    if (!cont) return;
    cont.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Cargando...</p></div>`;
    try {
        const lista = await db.get("trabajos?select=*&order=semana,created_at") || [];
        if (!lista.length) {
            cont.innerHTML = `<p style="color:var(--text-dim);text-align:center;padding:20px;font-size:0.88rem;">No hay trabajos publicados aún</p>`;
            return;
        }
        cont.innerHTML = lista.map(t => `
            <div class="lista-item">
                <span style="font-size:1.3rem">${getIcono(t.enlace,t.tipo)}</span>
                <div class="lista-item-info">
                    <div class="lista-item-sem">${escapeHTML(t.semana)}</div>
                    <div class="lista-item-title">${escapeHTML(t.titulo)}</div>
                </div>
                ${t.enlace&&t.enlace!=="#" ? `<a href="${escapeHTML(t.enlace)}" target="_blank" class="btn-ver-mini">Ver</a>` : ""}
                <button onclick="eliminarTrabajo(${t.id},'${escapeHTML(t.enlace)}',this)" class="btn-delete">🗑</button>
            </div>`).join("");
    } catch (err) {
        cont.innerHTML = `<p style="color:var(--danger);text-align:center;padding:20px;">Error: ${err.message}</p>`;
    }
}

async function eliminarTrabajo(id, enlace, btn) {
    if (!confirm("¿Eliminar este trabajo permanentemente?")) return;
    btn.disabled = true; btn.textContent = "...";
    try {
        if (enlace && enlace.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
            const ruta = enlace.split(`/public/${STORAGE_BUCKET}/`)[1];
            await db.deleteFile(ruta);
        }
        await db.delete(`trabajos?id=eq.${id}`);
        showToast("🗑 Trabajo eliminado", "");
        await cargarTrabajos();
        cargarListaAdmin();
    } catch (err) {
        showToast("❌ Error al eliminar", "error");
        btn.disabled = false; btn.textContent = "🗑";
    }
}

// ============================================================
// 🎉  TOAST
// ============================================================
let toastTimer;
function showToast(msg, type="") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

// ============================================================
// 🛡️  ESCAPE
// ============================================================
function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
