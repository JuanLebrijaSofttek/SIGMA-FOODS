// pendientes.js
// Resuelve los pendientes y parciales listados en PENDIENTES_Y_PARCIALES.md.
// Se aplica como capa final de overrides sobre el estado compartido (store).
(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Utilidades comunes
  // -----------------------------------------------------------------------
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const now = () => '16/10/2026 12:' + String(10 + Math.floor(Math.random() * 40)).padStart(2, '0') + ':00';

  function audit(accion, entidad, resultado = 'Exitoso') {
    store.audits.unshift([now(), store.user ? store.user[0] : 'Daniela Ríos', accion, entidad, resultado]);
  }

  // Exportación segura: guarda el dataset en store y lo recupera por clave,
  // en lugar de incrustar HTML/JSON dentro de atributos onclick (origen del
  // defecto visual reportado en Cavas, Anaqueles y Auditoría).
  store._exportSets = store._exportSets || {};
  window.exportSet = function (key) {
    const s = store._exportSets[key];
    if (!s) { showToast('No hay datos para exportar.'); return; }
    exportXlsx(s.name, s.headers, s.rows);
  };
  // Registra un dataset de exportación y devuelve un onclick seguro.
  function exportButton(key, name, headers, rows) {
    store._exportSets[key] = { name, headers, rows };
    return `<button class="btn" onclick="exportSet('${key}')">${I('download')} Exportar XLSX</button>`;
  }

  // Quita etiquetas HTML para exportar texto limpio.
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();

  // -----------------------------------------------------------------------
  // RF-03 / RF-04 / RF-23 — Defecto visual compartido en las exportaciones
  // La causa es incrustar filas con HTML dentro de JSON.stringify en el
  // atributo onclick. Se reescriben las pantallas afectadas para usar
  // exportButton() con datos ya limpios.
  // -----------------------------------------------------------------------

  // Anaqueles (RF-04): toolbar con export seguro arriba de "Nuevo anaquel".
  window.racks = function () {
    const cava = store.filters.rackCava || '';
    const data = store.racks.filter(x => !cava || x.cava === cava);
    const rows = data.map(x => ({
      _id: x.uid,
      Clave: `<span class="mono">${x.id}</span>`,
      Nombre: x.nombre, Cava: x.cava, Filas: x.filas, Columnas: x.columnas,
      Celdas: x.celdas, Ocupadas: x.ocupadas,
      Ocupación: `${(x.ocupadas / x.celdas * 100).toFixed(1)}%`,
      Estado: status(x.estado)
    }));
    const exportRows = data.map(x => ({
      Clave: x.id, Nombre: x.nombre, Cava: x.cava, Filas: x.filas, Columnas: x.columnas,
      Celdas: x.celdas, Ocupadas: x.ocupadas,
      Ocupación: `${(x.ocupadas / x.celdas * 100).toFixed(1)}%`, Estado: x.estado
    }));
    const exportHeaders = ['Clave', 'Nombre', 'Cava', 'Filas', 'Columnas', 'Celdas', 'Ocupadas', 'Ocupación', 'Estado'];
    return `<div class="page">${pageHead('Anaqueles', 'Administración de capacidad y ubicaciones')}<div class="table-card"><div class="toolbar"><select class="select" onchange="store.filters.rackCava=this.value;render()"><option value="">Todas las cavas</option>${store.cavas.map(c => `<option ${c.id === cava ? 'selected' : ''}>${c.id}</option>`).join('')}</select>${exportButton('racks', 'Anaqueles', exportHeaders, exportRows)}<button class="btn primary" onclick="newForm('rack')">${I('plus')} Nuevo anaquel</button></div>${table(['Clave', 'Nombre', 'Cava', 'Filas', 'Columnas', 'Celdas', 'Ocupadas', 'Ocupación', 'Estado'], rows, "id=>openDetail('rack',id)")}</div></div>`;
  };

  // Cavas (RF-03): usa exportCurrent que ya es seguro; sin cambios de datos,
  // pero aseguramos que el export de la matriz sea seguro (ver matrix abajo).

  // Auditoría (RF-23): pestañas funcionales + export seguro + drawer de detalle.
  store.auditTab = store.auditTab || 'Movimientos y cambios';

  function auditRowsFor(tab) {
    // Clasifica cada registro de store.audits por tipo de pestaña.
    const isAccess = a => /sesión|inicio de sesión|expiración|cierre/i.test(a[2]);
    const isExport = a => /exportar/i.test(a[2]);
    return store.audits
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => tab === 'Accesos' ? isAccess(a) : tab === 'Exportaciones' ? isExport(a) : (!isAccess(a) && !isExport(a)));
  }

  window.auditDetail = function (i) {
    const a = store.audits[i];
    if (!a) return;
    const antes = /autoriz/i.test(a[2]) ? 'Por autorizar' : /baja|inactiv/i.test(a[2]) ? 'Activo' : /salida/i.test(a[2]) ? 'Ubicada' : 'Estado previo';
    const despues = /autoriz/i.test(a[2]) ? 'Autorizado' : /baja|inactiv/i.test(a[2]) ? 'Inactivo' : /salida/i.test(a[2]) ? 'Fuera de cava' : 'Estado resultante';
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Registro de auditoría</span><h2 class="mono">AUD-${String(i + 1).padStart(4, '0')}</h2><p>${esc(a[2])}</p></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="form-grid">
        <div class="field"><label>Usuario</label><strong>${esc(a[1])}</strong></div>
        <div class="field"><label>Entidad</label><strong class="mono">${esc(a[3])}</strong></div>
        <div class="field"><label>Hora local (America/Monterrey)</label><strong>${esc(a[0])}</strong></div>
        <div class="field"><label>Hora UTC</label><strong>${esc(a[0].replace(/(\d{2}):(\d{2}):/, (m, h, mm) => String((+h + 6) % 24).padStart(2, '0') + ':' + mm + ':'))}</strong></div>
        <div class="field"><label>Correlación</label><strong class="mono">COR-${String(90000 + i).toString(16).toUpperCase()}</strong></div>
        <div class="field"><label>Origen</label><strong>Web · Chrome · 10.12.4.${(i % 250) + 1}</strong></div>
        <div class="field full"><label>Resultado</label>${status(a[4])}</div>
      </div>
      <div class="card"><strong>Antes / Después</strong><div class="activity-row"><span>Antes</span><span style="margin-left:auto">${esc(antes)}</span></div><div class="activity-row"><span>Después</span><span style="margin-left:auto">${esc(despues)}</span></div></div>
      <div class="drawer-footer"><button class="btn" onclick="store.drawer=null;render()">Cerrar</button><button class="btn primary" onclick="store.drawer=null;store.filters.query='${esc(a[3])}';goto('consultas')">${I('history')} Ver entidad en Consultas</button></div>`;
    render();
  };

  window.audit_view = function () {
    const tab = store.auditTab;
    const entries = auditRowsFor(tab);
    const rows = entries.map(({ a, i }) => ({
      _id: i,
      Fecha: a[0], Usuario: a[1], Acción: a[2],
      Entidad: `<span class="mono">${esc(a[3])}</span>`,
      Resultado: status(a[4])
    }));
    const exportRows = entries.map(({ a }) => ({ Fecha: a[0], Usuario: a[1], Acción: a[2], Entidad: a[3], Resultado: a[4] }));
    const tabs = ['Movimientos y cambios', 'Accesos', 'Exportaciones'];
    return `<div class="page">${pageHead('Auditoría', 'Registro inmutable de accesos, cambios y exportaciones')}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.auditTab='${t}';render()">${t} (${auditRowsFor(t).length})</button>`).join('')}</div>
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Entidad o correlación" oninput="store.filters.audit=this.value;render()" value="${esc(store.filters.audit || '')}"><select class="select" onchange="store.filters.auditResult=this.value;render()"><option value="">Todos los resultados</option><option ${store.filters.auditResult === 'Exitoso' ? 'selected' : ''}>Exitoso</option><option ${store.filters.auditResult === 'Fallido' ? 'selected' : ''}>Fallido</option></select>${exportButton('audit', 'Auditoría ' + tab, ['Fecha', 'Usuario', 'Acción', 'Entidad', 'Resultado'], exportRows)}</div>
      ${table(['Fecha', 'Usuario', 'Acción', 'Entidad', 'Resultado'], filterAuditRows(rows), "id=>auditDetail(id)")}</div></div>`;
  };

  function filterAuditRows(rows) {
    const q = (store.filters.audit || '').toLowerCase();
    const res = store.filters.auditResult || '';
    return rows.filter(r => {
      const text = (plain(r.Entidad) + ' ' + r.Usuario + ' ' + r.Acción).toLowerCase();
      const okQ = !q || text.includes(q);
      const okR = !res || plain(r.Resultado).includes(res);
      return okQ && okR;
    });
  }

  // Matrix: reemplaza el export inseguro por uno con exportButton.
  const matrixBase = window.matrix;
  window.matrix = function () {
    let html = matrixBase();
    // Reemplaza cualquier onclick de exportXlsx(...) remanente por export seguro.
    html = html.replace(/onclick="exportXlsx\([^"]*"/g, m => {
      const r = store.racks.find(x => x.uid === (store.filters.rack || 'R3')) || store.racks[3];
      const key = 'matrix-' + r.uid;
      const cells = [];
      const rowsL = 'ABCDEFGHIJKL'.slice(0, r.filas).split('');
      for (let ri = 0; ri < r.filas; ri++) for (let c = 1; c <= r.columnas; c++) cells.push({ Celda: `${rowsL[ri]}${c}`, Estado: (ri * r.columnas + c) > r.ocupadas ? 'Libre' : 'Ocupada' });
      store._exportSets[key] = { name: `Matriz ${r.id}`, headers: ['Celda', 'Estado'], rows: cells };
      return `onclick="exportSet('${key}')"`;
    });
    return html;
  };

  // -----------------------------------------------------------------------
  // RF-06 — Grupos de vino (prioridad alta)
  // Página con columnas Orden, Grupo, Comentarios, Vinos ligados y Estado.
  // Alta, detalle con selección múltiple de vinos, reordenar y baja bloqueada.
  // -----------------------------------------------------------------------
  store.groups = store.groups || [
    { orden: 1, nombre: 'Tintos nacionales', comentarios: 'Reserva base de eventos', vinos: ['V-001', 'V-004', 'V-005', 'V-006', 'V-007'], estado: 'Activo' },
    { orden: 2, nombre: 'Blancos nacionales', comentarios: 'Servicio frío', vinos: ['V-002', 'V-003'], estado: 'Activo' },
    { orden: 3, nombre: 'Españoles y otros', comentarios: '', vinos: ['V-008'], estado: 'Activo' },
    { orden: 4, nombre: 'Blanco francés', comentarios: '', vinos: ['V-009'], estado: 'Activo' },
    { orden: 5, nombre: 'Tinto francés', comentarios: 'Guarda premium', vinos: ['V-010'], estado: 'Activo' },
    { orden: 6, nombre: 'Para eventos', comentarios: 'Rotación rápida', vinos: ['V-001', 'V-003', 'V-005'], estado: 'Activo' },
    { orden: 7, nombre: 'Champagne', comentarios: '', vinos: [], estado: 'Activo' }
  ];

  function wineName(id) { const w = store.wines.find(x => x.id === id); return w ? w.nombre : id; }

  function groupsPage() {
    const q = (store.filters.groups || '').toLowerCase();
    const list = store.groups
      .filter(g => store.showGroupInactive || g.estado === 'Activo')
      .filter(g => (g.nombre + g.comentarios).toLowerCase().includes(q))
      .sort((a, b) => a.orden - b.orden);
    const rows = list.map((g, idx) => {
      const gi = store.groups.indexOf(g);
      return {
        _id: gi,
        Orden: `<div class="order-cell"><button class="icon-btn mini" title="Subir" onclick="event.stopPropagation();groupMove(${gi},-1)">${I('chevron-up')}</button><strong>${g.orden}</strong><button class="icon-btn mini" title="Bajar" onclick="event.stopPropagation();groupMove(${gi},1)">${I('chevron-down')}</button></div>`,
        Grupo: `<strong>${esc(g.nombre)}</strong>`,
        Comentarios: esc(g.comentarios) || '<span class="muted">—</span>',
        'Vinos ligados': `<span class="status info">${g.vinos.length}</span>`,
        Estado: status(g.estado)
      };
    });
    const exportRows = list.map(g => ({ Orden: g.orden, Grupo: g.nombre, Comentarios: g.comentarios, 'Vinos ligados': g.vinos.length, Estado: g.estado }));
    return `<div class="page">${pageHead('Grupos de vino', 'Agrupaciones muchos a muchos con vinos', `<button class="btn primary" onclick="groupNew()">${I('plus')} Nuevo grupo</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar grupo" oninput="store.filters.groups=this.value;render()" value="${esc(store.filters.groups || '')}">${exportButton('groups', 'Grupos de vino', ['Orden', 'Grupo', 'Comentarios', 'Vinos ligados', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showGroupInactive ? 'checked' : ''} onchange="store.showGroupInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Orden', 'Grupo', 'Comentarios', 'Vinos ligados', 'Estado'], rows, "id=>groupDetail(id)")}</div></div>`;
  }

  window.groupMove = function (gi, dir) {
    const g = store.groups[gi];
    const sorted = [...store.groups].sort((a, b) => a.orden - b.orden);
    const pos = sorted.indexOf(g);
    const swap = sorted[pos + dir];
    if (!swap) return;
    const tmp = g.orden; g.orden = swap.orden; swap.orden = tmp;
    // Renumera de forma contigua.
    store.groups.sort((a, b) => a.orden - b.orden).forEach((x, n) => x.orden = n + 1);
    audit('Reordenar grupo', g.nombre);
    render();
  };

  window.groupNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo grupo</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();groupSave(event)"><div class="form-grid">
      <label class="field"><span>Nombre</span><input class="input" name="nombre" required></label>
      <label class="field"><span>Orden</span><input class="input" type="number" name="orden" min="1" value="${store.groups.length + 1}" required></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.groupSave = function (event) {
    const fd = new FormData(event.target);
    const nombre = fd.get('nombre').trim();
    if (store.groups.some(g => g.nombre.toLowerCase() === nombre.toLowerCase())) { showToast('Ya existe un grupo con ese nombre.'); return; }
    store.groups.push({ orden: parseInt(fd.get('orden')) || store.groups.length + 1, nombre, comentarios: fd.get('comentarios') || '', vinos: [], estado: 'Activo' });
    store.groups.sort((a, b) => a.orden - b.orden).forEach((x, n) => x.orden = n + 1);
    audit('Crear grupo', nombre);
    store.drawer = null;
    showToast(`Grupo "${nombre}" creado.`, 'Ya puedes ligar vinos desde su detalle.');
  };

  window.groupDetail = function (gi) {
    const g = store.groups[gi];
    if (!g) return;
    const q = (store.groupWineFilter || '').toLowerCase();
    const wineList = store.wines.filter(w => w.nombre.toLowerCase().includes(q));
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Grupo · Orden ${g.orden}</span><h2>${esc(g.nombre)}</h2><p>${esc(g.comentarios) || 'Sin comentarios'}</p></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="field"><label>Vinos ligados</label><strong>${g.vinos.length}</strong></div>
      <label class="field"><span>Buscar vino</span><input class="input" value="${esc(store.groupWineFilter || '')}" oninput="store.groupWineFilter=this.value;groupDetail(${gi})"></label>
      <div class="check-list">${wineList.map(w => `<label class="check-row"><input type="checkbox" ${g.vinos.includes(w.id) ? 'checked' : ''} onchange="groupToggleWine(${gi},'${w.id}',this.checked)"> <span><strong>${esc(w.nombre)}</strong><small class="muted"> · ${esc(w.tipo)}</small></span></label>`).join('')}</div>
      <div class="drawer-footer"><button class="btn danger" onclick="groupDeactivate(${gi})">${I('archive')} Dar de baja</button><button class="btn primary" onclick="store.drawer=null;store.groupWineFilter='';render()">Listo</button></div>`;
    render();
  };

  window.groupToggleWine = function (gi, wineId, checked) {
    const g = store.groups[gi];
    if (checked) { if (!g.vinos.includes(wineId)) g.vinos.push(wineId); }
    else g.vinos = g.vinos.filter(x => x !== wineId);
    // Mantiene en sincronía la columna "Grupos" de la pantalla Vinos.
    syncWineGroups();
    audit(checked ? 'Ligar vino a grupo' : 'Desligar vino de grupo', `${g.nombre} · ${wineId}`);
    groupDetail(gi);
  };

  // Recalcula el campo .grupos de cada vino a partir de store.groups.
  function syncWineGroups() {
    store.wines.forEach(w => {
      const names = store.groups.filter(g => g.estado === 'Activo' && g.vinos.includes(w.id)).map(g => g.nombre);
      w.grupos = names.join(', ');
    });
  }

  window.groupDeactivate = function (gi) {
    const g = store.groups[gi];
    if (g.vinos.length) { showToast(`No puedes dar de baja "${g.nombre}".`, `Tiene ${g.vinos.length} vinos ligados. Desligalos primero.`); return; }
    g.estado = 'Inactivo';
    audit('Dar de baja grupo', g.nombre);
    store.drawer = null;
    showToast(`Grupo "${g.nombre}" dado de baja.`, 'La historia se conserva.');
  };

  // -----------------------------------------------------------------------
  // RF-06 — Tipos de vino: alta, detalle, edición y baja bloqueada.
  // -----------------------------------------------------------------------
  store.types = store.types || [
    { nombre: 'Tinto', comentarios: 'Guarda y servicio', estado: 'Activo' },
    { nombre: 'Blanco', comentarios: 'Servicio frío', estado: 'Activo' },
    { nombre: 'Rosado', comentarios: '', estado: 'Activo' },
    { nombre: 'Espumoso', comentarios: '', estado: 'Activo' },
    { nombre: 'Generoso', comentarios: '', estado: 'Activo' },
    { nombre: 'Destilado', comentarios: '', estado: 'Activo' }
  ];

  const typeCount = nombre => store.wines.filter(w => w.tipo === nombre).length;

  function typesPage() {
    const list = store.types.filter(t => store.showTypeInactive || t.estado === 'Activo');
    const rows = list.map(t => ({
      _id: store.types.indexOf(t),
      Tipo: `<strong>${esc(t.nombre)}</strong>`,
      Comentarios: esc(t.comentarios) || '<span class="muted">—</span>',
      'Vinos ligados': `<span class="status info">${typeCount(t.nombre)}</span>`,
      Estado: status(t.estado)
    }));
    const exportRows = list.map(t => ({ Tipo: t.nombre, Comentarios: t.comentarios, 'Vinos ligados': typeCount(t.nombre), Estado: t.estado }));
    return `<div class="page">${pageHead('Tipos de vino', 'Catálogo administrable con baja lógica', `<button class="btn primary" onclick="typeNew()">${I('plus')} Nuevo tipo</button>`)}
      <div class="table-card"><div class="toolbar">${exportButton('types', 'Tipos de vino', ['Tipo', 'Comentarios', 'Vinos ligados', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showTypeInactive ? 'checked' : ''} onchange="store.showTypeInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Tipo', 'Comentarios', 'Vinos ligados', 'Estado'], rows, "id=>typeDetail(id)")}</div></div>`;
  }

  window.typeNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo tipo de vino</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();typeSave(event,-1)"><div class="form-grid"><label class="field full"><span>Nombre</span><input class="input" name="nombre" required></label><label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label></div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.typeDetail = function (ti) {
    const t = store.types[ti], n = typeCount(t.nombre);
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Tipo de vino</span><h2>${esc(t.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="form-grid"><div class="field"><label>Vinos ligados</label><strong>${n}</strong></div><div class="field"><label>Estado</label>${status(t.estado)}</div><div class="field full"><label>Comentarios</label><strong>${esc(t.comentarios) || '—'}</strong></div></div>
      <div class="drawer-footer"><button class="btn danger" onclick="typeDeactivate(${ti})">${I('archive')} Dar de baja</button><button class="btn primary" onclick="typeEdit(${ti})">${I('pencil')} Editar</button></div>`;
    render();
  };

  window.typeEdit = function (ti) {
    const t = store.types[ti];
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Edición</span><h2>${esc(t.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();typeSave(event,${ti})"><div class="form-grid"><label class="field full"><span>Nombre</span><input class="input" name="nombre" required value="${esc(t.nombre)}"></label><label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500">${esc(t.comentarios)}</textarea></label></div><div class="drawer-footer"><button type="button" class="btn" onclick="typeDetail(${ti})">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`;
    render();
  };

  window.typeSave = function (event, ti) {
    const fd = new FormData(event.target), nombre = fd.get('nombre').trim(), comentarios = fd.get('comentarios') || '';
    if (ti === -1) {
      if (store.types.some(t => t.nombre.toLowerCase() === nombre.toLowerCase())) { showToast('Ya existe ese tipo.'); return; }
      store.types.push({ nombre, comentarios, estado: 'Activo' });
      audit('Crear tipo de vino', nombre);
      showToast(`Tipo "${nombre}" creado.`);
    } else {
      store.types[ti].nombre = nombre; store.types[ti].comentarios = comentarios;
      audit('Editar tipo de vino', nombre);
      showToast(`Tipo "${nombre}" actualizado.`);
    }
    store.drawer = null; render();
  };

  window.typeDeactivate = function (ti) {
    const t = store.types[ti], n = typeCount(t.nombre);
    if (n) { showToast(`No puedes dar de baja "${t.nombre}".`, `Tiene ${n} vinos ligados.`); return; }
    t.estado = 'Inactivo';
    audit('Dar de baja tipo de vino', t.nombre);
    store.drawer = null;
    showToast(`Tipo "${t.nombre}" dado de baja.`);
  };

  // -----------------------------------------------------------------------
  // RF-07 — Proveedores y contactos (prioridad alta)
  // -----------------------------------------------------------------------
  store.suppliers = store.suppliers || [
    {
      id: 'PRV-01', nombre: 'Vinos Selectos del Norte, S.A. de C.V.', direccion: 'Av. Gómez Morín 1100', ciudad: 'Monterrey, N.L.',
      telefono: '81 8123 4500', correo: 'ventas@vinosselectos.mx', comentarios: 'Proveedor principal de vino nacional.', estado: 'Activo',
      contactos: [
        { nombre: 'Laura Benavides', puesto: 'Gerente de cuenta', correo: 'laura@vinosselectos.mx', telefono: '81 8123 4501', principal: true },
        { nombre: 'Marco Treviño', puesto: 'Logística', correo: 'marco@vinosselectos.mx', telefono: '81 8123 4502', principal: false }
      ],
      lotes: Array.from({ length: 14 }, (_, i) => ({ id: `LT-2026-${String(128 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/09/2026`, botellas: 12 + (i % 5) * 6 }))
    },
    {
      id: 'PRV-02', nombre: 'Importadora Gourmet del Bajío, S.A. de C.V.', direccion: 'Blvd. Bernardo Quintana 200', ciudad: 'Querétaro, Qro.',
      telefono: '442 215 7788', correo: 'compras@gourmetbajio.mx', comentarios: '', estado: 'Activo',
      contactos: [{ nombre: 'Patricia Luna', puesto: 'Dirección comercial', correo: 'patricia@gourmetbajio.mx', telefono: '442 215 7789', principal: true }],
      lotes: Array.from({ length: 9 }, (_, i) => ({ id: `LT-2026-${String(201 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/08/2026`, botellas: 12 }))
    },
    {
      id: 'PRV-03', nombre: 'Casa Vinícola Peninsular, S.A. de C.V.', direccion: 'Carr. Ensenada-Tecate km 90', ciudad: 'Ensenada, B.C.',
      telefono: '646 178 3322', correo: 'contacto@peninsular.mx', comentarios: 'Entregas quincenales.', estado: 'Activo',
      contactos: [{ nombre: 'Rodrigo Meza', puesto: 'Ventas', correo: 'rodrigo@peninsular.mx', telefono: '646 178 3323', principal: true }],
      lotes: Array.from({ length: 6 }, (_, i) => ({ id: `LT-2026-${String(301 + i).padStart(4, '0')}`, fecha: `${String((i % 28) + 1).padStart(2, '0')}/07/2026`, botellas: 24 }))
    }
  ];

  function suppliersPage() {
    const q = (store.filters.suppliers || '').toLowerCase();
    const list = store.suppliers.filter(s => store.showSupplierInactive || s.estado === 'Activo').filter(s => (s.nombre + s.ciudad).toLowerCase().includes(q));
    const rows = list.map(s => ({
      _id: s.id,
      Proveedor: `<strong>${esc(s.nombre)}</strong>`,
      Ciudad: esc(s.ciudad),
      Contactos: `<span class="status info">${s.contactos.length}</span>`,
      Lotes: s.lotes.length,
      Estado: status(s.estado)
    }));
    const exportRows = list.map(s => ({ Proveedor: s.nombre, Ciudad: s.ciudad, Contactos: s.contactos.length, Lotes: s.lotes.length, Estado: s.estado }));
    return `<div class="page">${pageHead('Proveedores', 'Datos, contactos y lotes recibidos', `<button class="btn primary" onclick="supplierNew()">${I('plus')} Nuevo proveedor</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar proveedor" oninput="store.filters.suppliers=this.value;render()" value="${esc(store.filters.suppliers || '')}">${exportButton('suppliers', 'Proveedores', ['Proveedor', 'Ciudad', 'Contactos', 'Lotes', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showSupplierInactive ? 'checked' : ''} onchange="store.showSupplierInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Proveedor', 'Ciudad', 'Contactos', 'Lotes', 'Estado'], rows, "id=>supplierDetail(id)")}</div></div>`;
  }

  window.supplierNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo proveedor</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();supplierSave(event)"><div class="form-grid">
      <label class="field full"><span>Razón social</span><input class="input" name="nombre" required></label>
      <label class="field full"><span>Dirección</span><input class="input" name="direccion" required></label>
      <label class="field"><span>Ciudad</span><input class="input" name="ciudad" required></label>
      <label class="field"><span>Teléfono</span><input class="input" name="telefono" required pattern="[0-9 +()-]{7,}" title="Al menos 7 dígitos"></label>
      <label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label>
      <label class="field"><span>Contacto principal</span><input class="input" name="contacto" required></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.supplierSave = function (event) {
    const fd = new FormData(event.target);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fd.get('correo'))) { showToast('Correo inválido.'); return; }
    const id = `PRV-${String(store.suppliers.length + 1).padStart(2, '0')}`;
    store.suppliers.push({
      id, nombre: fd.get('nombre').trim(), direccion: fd.get('direccion'), ciudad: fd.get('ciudad'),
      telefono: fd.get('telefono'), correo: fd.get('correo'), comentarios: fd.get('comentarios') || '', estado: 'Activo',
      contactos: [{ nombre: fd.get('contacto'), puesto: 'Contacto principal', correo: fd.get('correo'), telefono: fd.get('telefono'), principal: true }],
      lotes: []
    });
    audit('Crear proveedor', id);
    store.drawer = null;
    showToast(`Proveedor ${id} creado.`, 'Aparece al final del listado con 1 contacto.');
  };

  store.supplierTab = store.supplierTab || 'Datos';
  window.supplierDetail = function (id) {
    store.detailSupplier = id;
    store.supplierTab = 'Datos';
    store.page = 'supplier-detail';
    store.drawer = null;
    render(); window.scrollTo(0, 0);
  };

  function supplierDetailPage() {
    const s = store.suppliers.find(x => x.id === store.detailSupplier);
    if (!s) return groupsPage();
    const tab = store.supplierTab;
    let body;
    if (tab === 'Contactos') {
      body = `${table(['Nombre', 'Puesto', 'Correo', 'Teléfono', 'Principal'], s.contactos.map((c, i) => ({ _id: i, Nombre: esc(c.nombre), Puesto: esc(c.puesto), Correo: esc(c.correo), Teléfono: esc(c.telefono), Principal: c.principal ? status('Activo') : '—' })))}
        <div class="card"><strong>Agregar contacto</strong><form onsubmit="event.preventDefault();supplierAddContact(event)"><div class="form-grid"><label class="field"><span>Nombre</span><input class="input" name="nombre" required></label><label class="field"><span>Puesto</span><input class="input" name="puesto"></label><label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label><label class="field"><span>Teléfono</span><input class="input" name="telefono"></label></div><div class="button-row"><button class="btn primary">${I('plus')} Agregar contacto</button></div></form></div>`;
    } else if (tab === 'Lotes') {
      body = table(['Lote', 'Fecha', 'Botellas'], s.lotes.map((l, i) => ({ _id: i, Lote: `<span class="mono">${l.id}</span>`, Fecha: l.fecha, Botellas: l.botellas })));
    } else {
      body = `<div class="card"><div class="form-grid">
        <div class="field"><label>Razón social</label><strong>${esc(s.nombre)}</strong></div>
        <div class="field"><label>Ciudad</label><strong>${esc(s.ciudad)}</strong></div>
        <div class="field full"><label>Dirección</label><strong>${esc(s.direccion)}</strong></div>
        <div class="field"><label>Teléfono</label><strong>${esc(s.telefono)}</strong></div>
        <div class="field"><label>Correo</label><strong>${esc(s.correo)}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(s.comentarios) || '—'}</strong></div>
        <div class="field"><label>Estado</label>${status(s.estado)}</div>
      </div></div>`;
    }
    const tabs = [`Datos`, `Contactos (${s.contactos.length})`, `Lotes (${s.lotes.length})`];
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('proveedores')">Proveedores</button>${I('chevron-right')}<span>${esc(s.nombre)}</span></div>
      ${pageHead(s.nombre, s.ciudad)}
      <div class="tabs">${tabs.map(t => { const key = t.split(' (')[0]; return `<button class="tab ${key === tab ? 'active' : ''}" onclick="store.supplierTab='${key}';render()">${t}</button>`; }).join('')}</div>
      ${body}</div>`;
  }

  window.supplierAddContact = function (event) {
    const fd = new FormData(event.target);
    const s = store.suppliers.find(x => x.id === store.detailSupplier);
    s.contactos.push({ nombre: fd.get('nombre'), puesto: fd.get('puesto') || 'Contacto', correo: fd.get('correo'), telefono: fd.get('telefono') || '', principal: false });
    audit('Agregar contacto', s.id);
    showToast('Contacto agregado.', `${s.nombre} ahora tiene ${s.contactos.length} contactos.`);
    render();
  };

  // -----------------------------------------------------------------------
  // RF-08 — Solicitantes (prioridad alta)
  // -----------------------------------------------------------------------
  store.requesters = store.requesters || [
    { id: 'SOL-01', nombre: 'Mariana Treviño Garza', puesto: 'Directora General', area: 'Dirección General', correo: 'mariana.trevino@sigma.mx', telefono: '81 8000 1001', estado: 'Activo', comentarios: '', eventos: ['EVT-58213'], ordenes: ['OS-2026-0318'] },
    { id: 'SOL-02', nombre: 'Héctor Ibarra Núñez', puesto: 'Director de Finanzas', area: 'Finanzas', correo: 'hector.ibarra@sigma.mx', telefono: '81 8000 1002', estado: 'Activo', comentarios: '', eventos: ['EVT-57802', 'EVT-57940'], ordenes: ['OS-2026-0301'] },
    { id: 'SOL-03', nombre: 'Sofía Paredes León', puesto: 'Directora de Comunicación', area: 'Comunicación', correo: 'sofia.paredes@sigma.mx', telefono: '81 8000 1003', estado: 'Activo', comentarios: '', eventos: ['EVT-58077', 'EVT-58240'], ordenes: ['OS-2026-0309'] },
    { id: 'SOL-04', nombre: 'Raúl Esquivel Montes', puesto: 'Gerente Comercial', area: 'Comercial', correo: 'raul.esquivel@sigma.mx', telefono: '81 8000 1004', estado: 'Inactivo', comentarios: 'Dado de baja temporalmente.', eventos: [], ordenes: [] }
  ];

  function requestersPage() {
    const q = (store.filters.requesters || '').toLowerCase();
    const list = store.requesters.filter(s => store.showRequesterInactive || s.estado === 'Activo').filter(s => (s.nombre + s.area).toLowerCase().includes(q));
    const rows = list.map(s => ({
      _id: s.id,
      Solicitante: `<strong>${esc(s.nombre)}</strong><br><span class="muted">${esc(s.puesto)}</span>`,
      Área: esc(s.area),
      Eventos: s.eventos.length,
      Órdenes: s.ordenes.length,
      Estado: status(s.estado)
    }));
    const exportRows = list.map(s => ({ Solicitante: s.nombre, Área: s.area, Eventos: s.eventos.length, Órdenes: s.ordenes.length, Estado: s.estado }));
    return `<div class="page">${pageHead('Solicitantes', 'Personas que solicitan salidas y eventos', `<button class="btn primary" onclick="requesterNew()">${I('plus')} Nuevo solicitante</button>`)}
      <div class="table-card"><div class="toolbar"><input class="input" placeholder="Buscar solicitante" oninput="store.filters.requesters=this.value;render()" value="${esc(store.filters.requesters || '')}">${exportButton('requesters', 'Solicitantes', ['Solicitante', 'Área', 'Eventos', 'Órdenes', 'Estado'], exportRows)}<label class="btn"><input type="checkbox" ${store.showRequesterInactive ? 'checked' : ''} onchange="store.showRequesterInactive=this.checked;render()"> Mostrar inactivos</label></div>
      ${table(['Solicitante', 'Área', 'Eventos', 'Órdenes', 'Estado'], rows, "id=>requesterDetail(id)")}</div></div>`;
  }

  window.requesterNew = function () {
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>Nuevo solicitante</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();requesterSave(event)"><div class="form-grid">
      <label class="field full"><span>Nombre</span><input class="input" name="nombre" required></label>
      <label class="field"><span>Puesto</span><input class="input" name="puesto" required></label>
      <label class="field"><span>Área</span><input class="input" name="area" required></label>
      <label class="field"><span>Correo</span><input class="input" type="email" name="correo" required></label>
      <label class="field"><span>Teléfono</span><input class="input" name="telefono" required></label>
      <label class="field"><span>Estado</span><select class="select" name="estado"><option>Activo</option><option>Inactivo</option></select></label>
      <label class="field full"><span>Comentarios</span><textarea class="input" name="comentarios" maxlength="500"></textarea></label>
      </div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.requesterSave = function (event) {
    const fd = new FormData(event.target);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fd.get('correo'))) { showToast('Correo inválido.'); return; }
    const id = `SOL-${String(store.requesters.length + 1).padStart(2, '0')}`;
    store.requesters.push({ id, nombre: fd.get('nombre').trim(), puesto: fd.get('puesto'), area: fd.get('area'), correo: fd.get('correo'), telefono: fd.get('telefono'), estado: fd.get('estado'), comentarios: fd.get('comentarios') || '', eventos: [], ordenes: [] });
    audit('Crear solicitante', id);
    store.drawer = null;
    showToast(`Solicitante ${id} creado.`, 'Ya aparece en el listado.');
  };

  store.requesterTab = store.requesterTab || 'Datos';
  window.requesterDetail = function (id) {
    store.detailRequester = id; store.requesterTab = 'Datos'; store.page = 'requester-detail'; store.drawer = null;
    render(); window.scrollTo(0, 0);
  };

  function requesterDetailPage() {
    const s = store.requesters.find(x => x.id === store.detailRequester);
    if (!s) return requestersPage();
    const tab = store.requesterTab;
    let body;
    if (tab === 'Eventos') {
      const evs = store.events.filter(e => s.eventos.includes(e.id));
      body = evs.length ? table(['Evento', 'Fecha', 'Estado'], evs.map(e => ({ _id: e.id, Evento: `<strong>${esc(e.nombre)}</strong>`, Fecha: e.fecha, Estado: status(e.estado) }))) : `<div class="empty">${I('calendar-days')}<h2>Sin eventos ligados</h2></div>`;
    } else if (tab === 'Órdenes') {
      const ords = store.orders.filter(o => s.ordenes.includes(o.id));
      body = ords.length ? table(['Folio', 'Motivo', 'Botellas', 'Estatus'], ords.map(o => ({ _id: o.id, Folio: `<span class="mono">${o.id}</span>`, Motivo: o.motivo, Botellas: o.botellas, Estatus: status(o.estado) }))) : `<div class="empty">${I('clipboard-list')}<h2>Sin órdenes ligadas</h2></div>`;
    } else {
      body = `<div class="card"><div class="form-grid">
        <div class="field"><label>Puesto</label><strong>${esc(s.puesto)}</strong></div>
        <div class="field"><label>Área</label><strong>${esc(s.area)}</strong></div>
        <div class="field"><label>Correo</label><strong>${esc(s.correo)}</strong></div>
        <div class="field"><label>Teléfono</label><strong>${esc(s.telefono)}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(s.comentarios) || '—'}</strong></div>
        <div class="field"><label>Estado</label>${status(s.estado)}</div>
      </div><div class="button-row"><button class="btn" onclick="requesterToggleEstado('${s.id}')">${I('refresh-ccw')} ${s.estado === 'Activo' ? 'Marcar inactivo' : 'Reactivar'}</button></div></div>`;
    }
    const tabs = ['Datos', `Eventos (${s.eventos.length})`, `Órdenes (${s.ordenes.length})`];
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('solicitantes')">Solicitantes</button>${I('chevron-right')}<span>${esc(s.nombre)}</span></div>
      ${pageHead(s.nombre, `${s.puesto} · ${s.area}`)}
      <div class="tabs">${tabs.map(t => { const key = t.split(' (')[0]; return `<button class="tab ${key === tab ? 'active' : ''}" onclick="store.requesterTab='${key}';render()">${t}</button>`; }).join('')}</div>
      ${body}</div>`;
  }

  window.requesterToggleEstado = function (id) {
    const s = store.requesters.find(x => x.id === id);
    s.estado = s.estado === 'Activo' ? 'Inactivo' : 'Activo';
    audit('Cambiar estado de solicitante', `${id} · ${s.estado}`);
    showToast(`${s.nombre} ahora está ${s.estado.toLowerCase()}.`, 'El cambio se refleja en selectores de eventos.');
    render();
  };

  // Lista de solicitantes activos (se usa al crear eventos).
  window.activeRequesterNames = () => store.requesters.filter(s => s.estado === 'Activo').map(s => s.nombre);

  // -----------------------------------------------------------------------
  // RF-18 — Eventos: detalle completo, edición, cancelación y vínculo externo.
  // Se amplía entityDetail para eventos y se agregan acciones.
  // -----------------------------------------------------------------------
  const entityDetailBase = window.entityDetail;
  window.entityDetail = function () {
    const d = store.detail;
    if (d && d.type === 'event') return eventDetailPage();
    if (d && d.type === 'wine') return wineDetailPage();
    if (d && d.type === 'order') return orderDetailPage();
    if (d && d.type === 'adjustment') return adjustmentDetailPage();
    return entityDetailBase();
  };

  function eventDetailPage() {
    const x = store.events.find(e => e.id === store.detail.id);
    if (!x) return entityDetailBase();
    const tabs = ['Resumen', 'Vinos', 'Órdenes', 'Historial'];
    const tab = store.activeTab && tabs.includes(store.activeTab) ? store.activeTab : 'Resumen';
    const relatedOrders = store.orders.filter(o => o.evento === x.nombre);
    let body;
    if (tab === 'Vinos') {
      body = x.asignadas
        ? `<div class="summary-grid"><div class="kpi"><span>Asignadas</span><strong>${x.asignadas}</strong></div><div class="kpi"><span>Utilizadas</span><strong>${x.utilizadas}</strong></div><div class="kpi"><span>Devueltas</span><strong>${x.devueltas}</strong></div><div class="kpi"><span>Costo utilizado</span><strong>${x.id === 'EVT-58213' ? 'US$ 540.00' : money(0)}</strong></div></div>
          ${table(['Vino', 'Asignadas', 'Utilizadas', 'Devueltas'], [{ Vino: 'Monte Xanic Chenin Colombard', Asignadas: 8, Utilizadas: 8, Devueltas: 0 }, { Vino: 'Santo Tomás Único', Asignadas: 12, Utilizadas: 7, Devueltas: 5 }, { Vino: 'Matarromera Reserva', Asignadas: 4, Utilizadas: 4, Devueltas: 0 }])}`
        : `<div class="empty">${I('wine')}<h2>Este evento aún no tiene vinos asignados.</h2><button class="btn primary" onclick="newForm('order')">Crear orden de salida</button></div>`;
    } else if (tab === 'Órdenes') {
      body = relatedOrders.length ? table(['Folio', 'Motivo', 'Botellas', 'Estatus'], relatedOrders.map(o => ({ _id: o.id, Folio: `<span class="mono">${o.id}</span>`, Motivo: o.motivo, Botellas: o.botellas, Estatus: status(o.estado) }))) : `<div class="empty">${I('clipboard-list')}<h2>Sin órdenes para este evento</h2></div>`;
    } else if (tab === 'Historial') {
      body = `<section class="card"><h2>Línea de tiempo</h2>${[[x.fecha.split(' ')[0], 'Creación', 'Evento registrado'], ['14/10/2026', 'Asignación', `${x.asignadas || 0} botellas asignadas`], ['15/10/2026', 'Surtido', `${x.utilizadas || 0} utilizadas`], ['16/10/2026', 'Devolución', `${x.devueltas || 0} devueltas`]].map(r => `<div class="activity-row"><span class="state-icon info">${I('history')}</span><div><strong>${r[1]}</strong><div>${r[2]}</div><small class="muted">${r[0]}</small></div></div>`).join('')}</section>`;
    } else {
      body = `<div class="summary-grid"><div class="kpi"><span>Asignadas</span><strong>${x.asignadas}</strong></div><div class="kpi"><span>Utilizadas</span><strong>${x.utilizadas}</strong></div><div class="kpi"><span>Devueltas</span><strong>${x.devueltas}</strong></div><div class="kpi"><span>Órdenes</span><strong>${relatedOrders.length}</strong></div></div>
        <div class="card"><div class="form-grid">
        <div class="field"><label>Fecha y hora</label><strong>${esc(x.fecha)}</strong></div>
        <div class="field"><label>Lugar</label><strong>${esc(x.lugar)}</strong></div>
        <div class="field"><label>Solicitante</label><strong>${esc(x.solicitante)}</strong></div>
        <div class="field"><label>Origen</label><strong>${x.id.startsWith('EVT') ? 'Sistema de Eventos · ' + x.id : 'Alta local'}</strong></div>
        <div class="field full"><label>Comentarios</label><strong>${esc(x.comentarios) || 'Sin comentarios'}</strong></div>
        <div class="field"><label>Estado</label>${status(x.estado)}</div>
        </div></div>`;
    }
    const linked = x.id.startsWith('EVT');
    const actions = `<button class="btn" onclick="eventEdit('${x.id}')">${I('pencil')} Editar</button>${x.estado !== 'Cancelado' && x.estado !== 'Cerrado' ? `<button class="btn danger" onclick="eventCancel('${x.id}')">${I('circle-x')} Cancelar evento</button>` : ''}`;
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('eventos')">Eventos</button>${I('chevron-right')}<span>${esc(x.nombre)}</span></div>
      ${pageHead(x.nombre, `${x.fecha} · ${x.lugar}`, actions)}
      ${linked ? `<div class="ai-banner">${I('link')} Evento vinculado al Sistema de Eventos (${x.id}). Algunos campos se administran en el sistema origen.</div>` : ''}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.activeTab='${t}';render()">${t}</button>`).join('')}</div>
      ${body}</div>`;
  }

  window.eventEdit = function (id) {
    const x = store.events.find(e => e.id === id);
    const linked = x.id.startsWith('EVT');
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Edición</span><h2>${esc(x.nombre)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();eventSaveEdit('${id}')"><div class="form-grid">
      <label class="field full"><span>Nombre</span><input id="ev-nombre" class="input" required value="${esc(x.nombre)}" ${linked ? 'readonly' : ''}></label>
      <label class="field"><span>Fecha y hora</span><input id="ev-fecha" class="input" value="${esc(x.fecha)}" ${linked ? 'readonly' : ''}></label>
      <label class="field"><span>Lugar</span><input id="ev-lugar" class="input" value="${esc(x.lugar)}"></label>
      <label class="field full"><span>Solicitante</span><select id="ev-sol" class="select">${activeRequesterNames().map(n => `<option ${n === x.solicitante ? 'selected' : ''}>${esc(n)}</option>`).join('')}${activeRequesterNames().includes(x.solicitante) ? '' : `<option selected>${esc(x.solicitante)}</option>`}</select></label>
      <label class="field full"><span>Comentarios</span><textarea id="ev-com" class="input" maxlength="500">${esc(x.comentarios || '')}</textarea></label>
      </div>${linked ? `<p class="muted">Nombre y fecha están bloqueados por estar vinculado al Sistema de Eventos.</p>` : ''}<div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`;
    render();
  };

  window.eventSaveEdit = function (id) {
    const x = store.events.find(e => e.id === id);
    if (!x.id.startsWith('EVT')) { x.nombre = $('#ev-nombre').value; x.fecha = $('#ev-fecha').value; }
    x.lugar = $('#ev-lugar').value; x.solicitante = $('#ev-sol').value; x.comentarios = $('#ev-com').value;
    audit('Editar evento', id);
    store.drawer = null;
    showToast('Evento actualizado.', `${id} guardado y registrado en auditoría.`);
  };

  window.eventCancel = function (id) {
    store.modal = 'event-cancel'; store.cancelEventId = id; render();
  };
  window.eventCancelConfirm = function () {
    const motivo = ($('#cancel-motivo')?.value || '').trim();
    if (motivo.length < 10) { showToast('Indica un motivo de al menos 10 caracteres.'); return; }
    const x = store.events.find(e => e.id === store.cancelEventId);
    x.estado = 'Cancelado';
    const freed = x.asignadas - x.utilizadas;
    audit('Cancelar evento', `${x.id} · ${motivo}`);
    store.modal = null;
    showToast(`Evento ${x.id} cancelado.`, freed > 0 ? `Se liberaron ${freed} botellas no surtidas.` : 'Sin botellas pendientes por liberar.');
  };

  window.eventLinkExternal = function () {
    store.modal = 'event-link'; render();
  };
  window.eventLinkImport = function (extId, nombre) {
    if (store.events.some(e => e.id === extId)) { showToast('Ese evento ya está vinculado.'); store.modal = null; render(); return; }
    store.events.push({ id: extId, nombre, fecha: '22/10/2026 19:00', lugar: 'Salón Consejo, Piso 12', solicitante: 'Mariana Treviño Garza', estado: 'Confirmado', asignadas: 0, utilizadas: 0, devueltas: 0, comentarios: 'Importado del Sistema de Eventos.' });
    audit('Vincular evento externo', extId);
    store.modal = null;
    showToast(`Evento ${extId} vinculado.`, 'Aparece en el listado con origen Sistema de Eventos.');
  };

  // Eventos: botón de vínculo real que abre modal de resultados simulados.
  const eventsBase2 = window.events;
  window.events = function () {
    let html = eventsBase2();
    html = html.replace(/onclick="showToast\('Sistema de Eventos'[^"]*"/, "onclick=\"eventLinkExternal()\"");
    return html;
  };

  // Modales RF-18 agregados al overlay.
  const overlayBase = window.overlay;
  window.overlay = function () {
    let html = overlayBase();
    if (store.modal === 'event-cancel') {
      html += `<div class="modal-backdrop"><div class="modal"><div class="drawer-head"><h2>Cancelar evento</h2><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div><p>Esta acción cancela el evento y libera las botellas no surtidas. El motivo es obligatorio.</p><label class="field full"><span>Motivo de cancelación</span><textarea id="cancel-motivo" class="input" minlength="10" maxlength="300" placeholder="Describe el motivo (mínimo 10 caracteres)"></textarea></label><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Volver</button><button class="btn danger" onclick="eventCancelConfirm()">Cancelar evento</button></div></div></div>`;
    }
    if (store.modal === 'event-link') {
      const results = [['EVT-58213', 'Cena del Consejo de Administración'], ['EVT-58301', 'Posada corporativa 2026'], ['EVT-58322', 'Lanzamiento línea Gourmet']];
      html += `<div class="modal-backdrop"><div class="modal account-modal"><div class="drawer-head"><div><h2>Sistema de Eventos</h2><p>Resultados simulados de la búsqueda</p></div><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div>${results.map(r => `<button class="account-row" onclick="eventLinkImport('${r[0]}','${esc(r[1])}')"><span class="avatar-circle">${I('calendar-days')}</span><span><strong>${esc(r[1])}</strong><small class="mono">${r[0]}</small></span>${I('chevron-right')}</button>`).join('')}</div></div>`;
    }
    return html;
  };

  // -----------------------------------------------------------------------
  // RF-02 — Roles: persistir la matriz EXACTA y avisar cambios sin guardar.
  // Modelo por módulo: cada rol guarda un mapa módulo -> Set(permisos).
  // No hay derivación ni cascada al guardar; se persiste lo que se ve.
  // -----------------------------------------------------------------------
  const basePerms = { 'Responsable de cavas': 'VCEBX$', 'Operador de cava': 'VCE', 'Solicitante': 'VC', 'Autorizador': 'VAX$', 'Auditor': 'VX$', 'Administrador': 'VCEBAX$' };
  const permCols = [['V', 'Ver'], ['C', 'Crear'], ['E', 'Editar'], ['B', 'Dar de baja'], ['A', 'Autorizar'], ['X', 'Exportar'], ['$', 'Ver costos']];
  const permGroups = [['Inicio', ['Inicio']], ['Operación', ['Recepción de lotes', 'Escaneo', 'Asignar y ubicar', 'Eventos', 'Órdenes de salida', 'Ajustes']], ['Inventario', ['Cavas', 'Anaqueles', 'Vinos', 'Consultas e historial']], ['Análisis', ['Reportes', 'Asistente IA']], ['Catálogos', ['Ubicaciones de origen', 'Grupos de vino', 'Tipos de vino', 'Presentaciones', 'Calidad', 'Proveedores', 'Solicitantes']], ['Administración', ['Usuarios', 'Roles y permisos', 'Parámetros', 'Auditoría', 'Registro de IA', 'Bitácora de exportaciones']]];
  const allModules = permGroups.flatMap(g => g[1]);

  store.permSaved = store.permSaved || {};   // {rol: {módulo: "VCE$"}}
  store.permDraft = store.permDraft || null; // {role, map:{módulo:"VCE$"}, dirty}

  // Mapa guardado (o base) para un rol: módulo -> cadena de permisos.
  function savedMapFor(role) {
    if (store.permSaved[role]) return store.permSaved[role];
    const base = basePerms[role] || '';
    const map = {};
    allModules.forEach(m => { map[m] = base; });
    return map;
  }

  // Mapa efectivo a mostrar (draft si existe, si no el guardado/base).
  function effectiveMapFor(role) {
    if (store.permDraft && store.permDraft.role === role) return store.permDraft.map;
    return savedMapFor(role);
  }

  window.rolesSelect = function (role) {
    if (store.permDraft && store.permDraft.role !== role && store.permDraft.dirty) {
      store.pendingRole = role; store.modal = 'perm-unsaved'; render(); return;
    }
    store.selectedRole = role; store.permDraft = null; render();
  };

  function ensureDraft(role) {
    if (!store.permDraft || store.permDraft.role !== role) {
      // Copia profunda del mapa guardado/base para no mutarlo al editar.
      const src = savedMapFor(role);
      const map = {};
      allModules.forEach(m => { map[m] = src[m] || ''; });
      store.permDraft = { role, map, dirty: false };
    }
    return store.permDraft;
  }

  window.rolesTogglePerm = function (role, code, module, checked) {
    const draft = ensureDraft(role);
    let set = new Set((draft.map[module] || '').split('').filter(Boolean));
    if (code === 'V' && !checked) {
      // Desmarcar Ver desmarca todas las acciones del módulo.
      set = new Set();
    } else if (checked) {
      set.add(code);
      if (code !== 'V') set.add('V'); // cualquier acción implica Ver
    } else {
      set.delete(code);
    }
    // Reordena según permCols para una cadena estable.
    draft.map[module] = permCols.map(c => c[0]).filter(c => set.has(c)).join('');
    draft.dirty = true;
    render();
  };

  function rolesPagePersistent() {
    const role = store.selectedRole || 'Responsable de cavas';
    const draft = store.permDraft && store.permDraft.role === role ? store.permDraft : null;
    const map = effectiveMapFor(role);
    const checkedFor = (module, code) => (map[module] || '').includes(code);
    return `<div class="page">${pageHead('Roles y permisos', 'Permisos por módulo y acción')}
      ${draft && draft.dirty ? `<div class="ai-banner" style="border-left-color:var(--warning)">${I('triangle-alert')} Tienes cambios sin guardar en <strong>${esc(role)}</strong>.</div>` : ''}
      <div class="roles-layout"><section class="card"><h2>Roles</h2>${Object.keys(basePerms).map(r => `<button class="role-card ${r === role ? 'active' : ''}" onclick="rolesSelect('${r}')">${I('shield')}<span><strong>${r}</strong><small>${store.permSaved[r] ? 'Personalizado' : 'Base'}</small></span></button>`).join('')}</section>
      <section class="table-card"><div class="toolbar"><h2>Matriz de permisos: ${esc(role)}</h2></div><div class="table-scroll"><table class="permission-table"><thead><tr><th>Módulo</th>${permCols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${permGroups.map(g => `<tr class="group-row"><th colspan="8">${g[0]}</th></tr>${g[1].map(m => `<tr><td>${m}</td>${permCols.map(c => `<td><input type="checkbox" ${checkedFor(m, c[0]) ? 'checked' : ''} onchange="rolesTogglePerm('${role}','${c[0]}','${m.replace(/'/g, '')}',this.checked)"></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div>
      <div class="permission-footer"><p>Los permisos se aplican en la interfaz y en el servidor.</p><div class="button-row">${draft && draft.dirty ? `<button class="btn" onclick="store.permDraft=null;render()">Descartar</button>` : ''}<button class="btn primary" onclick="rolesSaveMatrix('${role}')">Guardar cambios</button></div></div></section></div></div>`;
  }

  window.rolesSaveMatrix = function (role) {
    const draft = store.permDraft && store.permDraft.role === role ? store.permDraft : null;
    // Persiste EXACTAMENTE el mapa mostrado (draft) o el guardado/base si no hubo cambios.
    const src = draft ? draft.map : effectiveMapFor(role);
    const saved = {};
    allModules.forEach(m => { saved[m] = src[m] || ''; });
    store.permSaved[role] = saved;
    store.permDraft = null;
    audit('Actualizar matriz de permisos', role);
    showToast(`Permisos de ${role} actualizados.`, 'Se persistió exactamente la matriz mostrada.');
  };

  // Utilidad para pruebas/consumo: total de casillas marcadas para un rol.
  window.permCheckedCount = function (role) {
    const map = effectiveMapFor(role);
    return allModules.reduce((n, m) => n + (map[m] || '').length, 0);
  };

  // -----------------------------------------------------------------------
  // RF-09 — Ficha de vino: Existencias, Lotes e Historial reales.
  // -----------------------------------------------------------------------
  // Genera un desglose determinista por añada y ubicación que suma la existencia.
  function wineBreakdown(w) {
    const total = w.existencia || 0;
    const anadas = [2018, 2019, 2020, 2021, 2022];
    const racks = store.racks.filter(r => r.estado === 'Activo');
    const rows = [];
    let left = total, i = 0;
    while (left > 0) {
      const take = Math.min(left, 12); // 12 por celda-grupo demostrativo
      const rk = racks[(i * 3) % racks.length];
      const col = (i % 6) + 1;
      rows.push({ anada: anadas[i % anadas.length], cava: rk.cava, anaquel: rk.id, ubicacion: `${'ABCDEFGHIJKL'[i % rk.filas]}${col}`, botellas: take });
      left -= take; i++;
    }
    if (!rows.length) rows.push({ anada: anadas[0], cava: '—', anaquel: '—', ubicacion: '—', botellas: 0 });
    return rows;
  }

  function wineLots(w) {
    // Lotes recibidos de este vino (demostrativos, coherentes con proveedores).
    const base = Math.max(1, Math.round((w.existencia || 0) / 24));
    return Array.from({ length: base }, (_, i) => ({
      id: `LT-2026-${String(61 + (w.id.charCodeAt(2) % 40) + i).padStart(4, '0')}`,
      fecha: `${String((i * 5 % 27) + 1).padStart(2, '0')}/0${(i % 9) + 1}/2026`,
      proveedor: i % 2 ? 'Importadora Gourmet del Bajío' : 'Vinos Selectos del Norte',
      botellas: 12 + (i % 3) * 6,
      costo: money(w.costo)
    }));
  }

  function wineHistory(w) {
    return [
      ['14/03/2024 09:30', 'Recepción', `Lote inicial · ${w.nombre}`],
      ['15/03/2024 12:10', 'Entrada por escaneo', `${w.existencia} botellas ubicadas`],
      ['02/10/2026 16:22', 'Salida', 'Órdenes de salida recientes'],
      ['16/10/2026 09:14', 'Ajuste de inventario', w.existencia ? 'Conteo físico conciliado' : 'Sin existencia']
    ];
  }

  function wineDetailPage() {
    const w = store.wines.find(x => x.id === store.detail.id);
    if (!w) return entityDetailBase();
    const tabs = ['Presentaciones', 'Existencias', 'Lotes', 'Historial'];
    const tab = store.activeTab && tabs.includes(store.activeTab) ? store.activeTab : 'Presentaciones';
    let body;
    if (tab === 'Existencias') {
      const bd = wineBreakdown(w);
      const totalCost = bd.reduce((s, r) => s + r.botellas * w.costo, 0);
      body = `<div class="summary-grid"><div class="kpi"><span>Existencia total</span><strong>${w.existencia}</strong></div><div class="kpi"><span>Por ubicar</span><strong>${w.porUbicar}</strong></div><div class="kpi"><span>Añadas</span><strong>${new Set(bd.map(r => r.anada)).size}</strong></div><div class="kpi"><span>Valor</span><strong>${money(totalCost)}</strong></div></div>
        ${table(['Añada', 'Cava', 'Anaquel', 'Ubicación', 'Botellas'], bd.map((r, i) => ({ _id: i, Añada: r.anada, Cava: r.cava, Anaquel: `<span class="mono">${r.anaquel}</span>`, Ubicación: `<span class="mono">${r.ubicacion}</span>`, Botellas: r.botellas })))}
        <p class="muted">La suma por añada y ubicación coincide con la existencia del listado de vinos.</p>`;
    } else if (tab === 'Lotes') {
      const lots = wineLots(w);
      body = lots.length && w.existencia ? table(['Lote', 'Fecha', 'Proveedor', 'Botellas', 'Costo unitario'], lots.map((l, i) => ({ _id: i, Lote: `<span class="mono">${l.id}</span>`, Fecha: l.fecha, Proveedor: l.proveedor, Botellas: l.botellas, 'Costo unitario': l.costo })))
        : `<div class="empty">${I('package')}<h2>Sin lotes recibidos</h2></div>`;
    } else if (tab === 'Historial') {
      body = `<section class="card"><h2>Historial de movimientos</h2>${wineHistory(w).map(r => `<div class="activity-row"><span class="state-icon info">${I('history')}</span><div><strong>${r[1]}</strong><div>${r[2]}</div><small class="muted">${r[0]}</small></div></div>`).join('')}</section>`;
    } else {
      body = table(['Código', 'Presentación', 'Costo'], w.presentacion.split(', ').map(p => ({ Código: p, Presentación: p.includes('1500') ? '1.5 L' : '750 ml', Costo: money(w.costo) })));
    }
    const canCost = roleCanSeeCost();
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('vinos')">Vinos</button>${I('chevron-right')}<span>${esc(w.nombre)}</span></div>
      ${pageHead(w.nombre, `${w.tipo} · ${w.origen}`, `<button class="btn" onclick="editRecord('wine','${w.id}')">${I('pencil')} Editar</button><button class="btn danger" onclick="deactivate('wine','${w.id}')">${I('archive')} Dar de baja</button>`)}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.activeTab='${t}';render()">${t}</button>`).join('')}</div>
      ${body}</div>`;
  }

  function roleCanSeeCost() {
    const role = store.role;
    return !['Solicitante', 'Operador de cava'].includes(role);
  }

  // -----------------------------------------------------------------------
  // RF-19 — Orden de salida: PDF/imprimir + Historial real (sin "Seguimiento").
  // -----------------------------------------------------------------------
  function orderHistory(o) {
    const h = [[o.fecha, 'Creación', `Borrador por ${o.solicitante}`]];
    if (/Autoriz|Cerrad|Surtid/.test(o.estado)) h.push(['14/10/2026 16:22', 'Autorización', 'Luis Fernando Cantú']);
    if (/Cerrad|Surtid/.test(o.estado)) h.push(['15/10/2026 17:45', 'Surtido', `${o.botellas} botellas por escaneo`]);
    if (/Cerrad/.test(o.estado)) h.push(['16/10/2026 09:12', 'Cierre', 'Orden cerrada']);
    return h;
  }

  function orderDetailPage() {
    const o = store.orders.find(x => x.id === store.detail.id);
    if (!o) return entityDetailBase();
    const tabs = ['Resumen', 'Líneas', 'Historial'];
    const tab = store.activeTab && tabs.includes(store.activeTab) ? store.activeTab : 'Resumen';
    const canCost = roleCanSeeCost();
    let body;
    if (tab === 'Líneas') {
      body = table(['Vino', 'Botellas', 'Ubicación', canCost ? 'Costo' : 'Costo'], [
        { Vino: 'Monte Xanic Chenin Colombard', Botellas: 8, Ubicación: 'AN-02 · G1 a G6', Costo: canCost ? 'US$ 112.00' : 'Sin permiso' },
        { Vino: 'Santo Tomás Único', Botellas: 12, Ubicación: 'AN-04 · I1 a J6', Costo: canCost ? 'US$ 384.00' : 'Sin permiso' },
        { Vino: 'Matarromera Reserva', Botellas: 4, Ubicación: 'AN-03 · C1 a C4', Costo: canCost ? 'US$ 168.00' : 'Sin permiso' }
      ]);
    } else if (tab === 'Historial') {
      body = `<section class="card"><h2>Historial de la orden</h2>${orderHistory(o).map(r => `<div class="activity-row"><span class="state-icon info">${I('history')}</span><div><strong>${r[1]}</strong><div>${r[2]}</div><small class="muted">${r[0]}</small></div></div>`).join('')}</section>`;
    } else {
      body = `<div class="summary-grid"><div class="kpi"><span>Botellas</span><strong>${o.botellas}</strong></div><div class="kpi"><span>Estatus</span><strong>${o.estado}</strong></div><div class="kpi"><span>Solicitante</span><strong style="font-size:15px">${esc(o.solicitante)}</strong></div><div class="kpi"><span>Costo</span><strong>${canCost ? money(o.costo) : 'Sin permiso'}</strong></div></div>
        <div class="card"><div class="form-grid">
        <div class="field"><label>Evento</label><strong>${esc(o.evento)}</strong></div>
        <div class="field"><label>Motivo</label><strong>${esc(o.motivo)}</strong></div>
        <div class="field"><label>Fecha</label><strong>${esc(o.fecha)}</strong></div>
        <div class="field"><label>Estatus</label>${status(o.estado)}</div>
        </div></div>`;
    }
    const auth = /Borrador/.test(o.estado) && ['Responsable de cavas', 'Autorizador', 'Administrador'].includes(store.role)
      ? `<button class="btn" onclick="orderAuthorize('${o.id}')">${I('stamp')} Autorizar</button>` : '';
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('ordenes')">Órdenes de salida</button>${I('chevron-right')}<span class="mono">${o.id}</span></div>
      ${pageHead(o.id, `${o.evento} · ${o.fecha}`, `${auth}<button class="btn" onclick="orderPrint('${o.id}')">${I('printer')} Imprimir</button><button class="btn primary" onclick="orderPdf('${o.id}')">${I('file-down')} Descargar PDF</button>`)}
      <div class="tabs">${tabs.map(t => `<button class="tab ${t === tab ? 'active' : ''}" onclick="store.activeTab='${t}';render()">${t}</button>`).join('')}</div>
      ${body}</div>`;
  }

  // Genera un documento imprimible real (ventana nueva) con folio, firmas y QR.
  function orderDocHtml(o) {
    const canCost = roleCanSeeCost();
    return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>${o.id}</title>
      <style>body{font-family:Inter,Arial,sans-serif;color:#1d1a1b;margin:40px;max-width:760px}
      h1{color:#910023;margin:0}.muted{color:#5b5557}.row{display:flex;justify-content:space-between;margin:4px 0}
      table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #e4dfdc;padding:8px;text-align:left;font-size:13px}
      th{background:#f6e7ea}.sign{display:flex;gap:40px;margin-top:60px}.sign div{flex:1;border-top:1px solid #1d1a1b;padding-top:6px;text-align:center}
      .qr{float:right;width:96px;height:96px;background:repeating-linear-gradient(90deg,#000 0 6px,#fff 6px 12px),repeating-linear-gradient(0deg,#000 0 6px,#fff 6px 12px);background-blend-mode:multiply;border:4px solid #000}</style></head>
      <body onload="window.print()"><div class="qr"></div><h1>Orden de salida</h1><p class="muted">Sigma Foods · Administración de Cavas</p>
      <div class="row"><strong>Folio</strong><span>${o.id}</span></div>
      <div class="row"><strong>Fecha</strong><span>${o.fecha}</span></div>
      <div class="row"><strong>Solicitante</strong><span>${o.solicitante}</span></div>
      <div class="row"><strong>Evento</strong><span>${o.evento}</span></div>
      <div class="row"><strong>Motivo</strong><span>${o.motivo}</span></div>
      <div class="row"><strong>Estatus</strong><span>${o.estado}</span></div>
      <table><thead><tr><th>Vino</th><th>Botellas</th><th>Ubicación</th>${canCost ? '<th>Costo</th>' : ''}</tr></thead><tbody>
      <tr><td>Monte Xanic Chenin Colombard</td><td>8</td><td>AN-02 · G1 a G6</td>${canCost ? '<td>US$ 112.00</td>' : ''}</tr>
      <tr><td>Santo Tomás Único</td><td>12</td><td>AN-04 · I1 a J6</td>${canCost ? '<td>US$ 384.00</td>' : ''}</tr>
      <tr><td>Matarromera Reserva</td><td>4</td><td>AN-03 · C1 a C4</td>${canCost ? '<td>US$ 168.00</td>' : ''}</tr>
      </tbody></table>
      <div class="sign"><div>Solicitó<br><small>${o.solicitante}</small></div><div>Autorizó<br><small>Luis Fernando Cantú</small></div><div>Entregó<br><small>Jorge Salinas</small></div></div>
      </body></html>`;
  }

  window.orderPrint = function (id) {
    const o = store.orders.find(x => x.id === id);
    const win = window.open('', '_blank');
    if (!win) { showToast('Habilita las ventanas emergentes para imprimir.'); return; }
    win.document.write(orderDocHtml(o)); win.document.close();
    audit('Imprimir orden de salida', id);
  };
  window.orderPdf = function (id) {
    const o = store.orders.find(x => x.id === id);
    // En el prototipo abrimos el documento imprimible; "Guardar como PDF" desde el diálogo.
    const win = window.open('', '_blank');
    if (!win) { showToast('Habilita las ventanas emergentes para generar el PDF.'); return; }
    win.document.write(orderDocHtml(o)); win.document.close();
    audit('Generar PDF de orden de salida', id);
    showToast(`PDF de ${id} generado.`, 'Usa "Guardar como PDF" en el diálogo de impresión.');
  };
  window.orderAuthorize = function (id) {
    const o = store.orders.find(x => x.id === id);
    if (o.solicitante === (store.user && store.user[0])) { showToast('Segregación de funciones.', 'No puedes autorizar una orden que tú solicitaste.'); return; }
    o.estado = 'Autorizada';
    audit('Autorizar orden', id);
    showToast(`Orden ${id} autorizada.`);
    render();
  };

  // -----------------------------------------------------------------------
  // RF-17 — Ajustes: Autorizar / Rechazar con comentario, según rol.
  // -----------------------------------------------------------------------
  function roleCanAuthorizeAdjust() {
    return ['Responsable de cavas', 'Autorizador', 'Administrador'].includes(store.role);
  }

  function adjustmentDetailPage() {
    const a = store.adjustments.find(x => x.id === store.detail.id);
    if (!a) return entityDetailBase();
    const pending = a.estado === 'Por autorizar';
    const canAuth = roleCanAuthorizeAdjust();
    return `<div class="page"><div class="breadcrumb"><button onclick="goto('ajustes')">Ajustes</button>${I('chevron-right')}<span class="mono">${a.id}</span></div>
      ${pageHead(a.id, `${a.tipo} · ${a.vino}`)}
      <div class="card"><div class="form-grid">
        <div class="field"><label>Botella</label><strong class="mono">${esc(a.botella)}</strong></div>
        <div class="field"><label>Vino</label><strong>${esc(a.vino)}</strong></div>
        <div class="field"><label>Motivo</label><strong>${esc(a.motivo)}</strong></div>
        <div class="field"><label>Solicitó</label><strong>${esc(a.solicito)}</strong></div>
        <div class="field"><label>Fecha</label><strong>${esc(a.fecha)}</strong></div>
        <div class="field"><label>Impacto</label><strong>${esc(a.impacto)}</strong></div>
        <div class="field full"><label>Estado</label>${status(a.estado)}</div>
      </div></div>
      ${pending ? (canAuth
        ? `<div class="card"><h2>Autorización</h2><p class="muted">Como ${esc(store.role)} puedes resolver este ajuste. El comentario es obligatorio y queda en auditoría.</p><label class="field full"><span>Comentario</span><textarea id="adj-comment" class="input" maxlength="300" placeholder="Justifica la decisión"></textarea></label><div class="button-row"><button class="btn danger" onclick="adjustResolve('${a.id}','Rechazado')">${I('circle-x')} Rechazar</button><button class="btn primary" onclick="adjustResolve('${a.id}','Autorizado')">${I('stamp')} Autorizar</button></div></div>`
        : `<div class="ai-banner">${I('info')} Tu rol (${esc(store.role)}) no puede autorizar ajustes. Requiere Autorizador, Responsable de cavas o Administrador.</div>`)
        : `<div class="ai-banner" style="border-left-color:var(--success)">${I('circle-check')} Ajuste ${a.estado.toLowerCase()}.</div>`}
    </div>`;
  }

  window.adjustResolve = function (id, decision) {
    const a = store.adjustments.find(x => x.id === id);
    const comment = ($('#adj-comment')?.value || '').trim();
    if (comment.length < 5) { showToast('Agrega un comentario de al menos 5 caracteres.'); return; }
    a.estado = decision;
    if (decision === 'Autorizado' && /Pendiente/i.test(a.impacto)) a.impacto = a.tipo === 'Entrada' ? '+1 · aplicado' : '−1 · aplicado';
    audit(decision === 'Autorizado' ? 'Autorizar ajuste' : 'Rechazar ajuste', `${id} · ${comment}`);
    showToast(`Ajuste ${id} ${decision.toLowerCase()}.`, decision === 'Autorizado' ? 'Se actualizó existencia, celda e historial.' : 'No se aplicó ningún cambio de inventario.');
    store.activeTab = null;
    goto('ajustes');
  };

  // -----------------------------------------------------------------------
  // RF-16 — Asignar y ubicar: flujo de resolución con comentario obligatorio.
  // Reescribe asignar() para eliminar elementos fuera de alcance y usar modales.
  // -----------------------------------------------------------------------
  store.resolved = store.resolved || {};        // {clave: true} elementos resueltos
  const asignarCounts = () => ({
    'Preentradas': ['LT-2026-0142'].filter(k => !store.resolved[k]).length,
    'Entradas por ubicar': ['BOT-0034-002'].filter(k => !store.resolved[k]).length,
    'Salidas sin evento': ['BOT-0071-005-006'].filter(k => !store.resolved[k]).length,
    'Inconsistencias': ['BOT-0098-011', 'BOT-0112-003', 'BOT-0034-002b'].filter(k => !store.resolved[k]).length
  });

  window.asignar = function () {
    const tab = store.activeTab || 'Preentradas';
    const counts = asignarCounts();
    const card = (key, body, action, actionLabel) => store.resolved[key]
      ? `<div class="card resolved"><span class="status success">${I('circle-check')} Resuelto</span><p class="muted">Este elemento salió de la lista.</p></div>`
      : `<div class="card">${body}<button class="btn primary" onclick="${action}">${actionLabel}</button></div>`;
    let content;
    if (tab === 'Preentradas') {
      content = `<div class="grid-2">${card('LT-2026-0142', `<span class="mono">LT-2026-0142</span><h2>36 botellas · Hoy</h2><p>Casa Madero 3V y Monte Xanic Chenin Colombard</p>`, "goto('escaneo')", 'Ubicar')}</div>`;
    } else if (tab === 'Entradas por ubicar') {
      content = card('BOT-0034-002', `<span class="mono">BOT-0034-002</span><h2>Echézeaux Grand Cru 2017</h2><p>Entrada sin ubicación desde 05/10/2026 · 8 días</p>`, "resolveFlow('BOT-0034-002','Confirmar ubicación','ubicada en AN-01 · L5')", 'Confirmar ubicación');
    } else if (tab === 'Salidas sin evento') {
      content = card('BOT-0071-005-006', `<h2>2 salidas del sistema anterior</h2><p>BOT-0071-005 y BOT-0071-006 · Casa Madero 2V 2024</p><p class="muted">Las salidas nuevas ya exigen orden o ajuste.</p>`, "resolveFlow('BOT-0071-005-006','Asignar a evento','asignadas a Cierre trimestral Q3')", 'Asignar a evento');
    } else {
      content = `<div class="grid-2">${[['BOT-0098-011', 'Salida registrada pero sigue ubicada en AN-04 · L5', 'Liberar la ubicación'], ['BOT-0112-003', 'Aparece en CAV-02 › AN-01 › B2 y B3', 'Liberar múltiples ubicaciones'], ['BOT-0034-002b', 'Entrada registrada sin ubicación', 'Dar entrada y reubicar']].map(x => card(x[0], `<span class="mono">${x[0].replace('b', '')}</span><h2>${x[1]}</h2>`, `resolveFlow('${x[0]}','${x[2]}','Inconsistencia cerrada')`, x[2])).join('')}</div>`;
    }
    return `<div class="page">${pageHead('Asignar y ubicar', 'Resuelve pendientes sin perder el registro original')}
      <div class="tabs">${Object.keys(counts).map(t => `<button class="tab ${tab === t ? 'active' : ''}" onclick="store.activeTab='${t}';render()">${t} (${counts[t]})</button>`).join('')}</div>
      ${content}</div>`;
  };

  // Abre modal de confirmación con comentario obligatorio.
  window.resolveFlow = function (key, title, result) {
    store.modal = 'resolve'; store.resolveCtx = { key, title, result }; render();
  };
  window.resolveConfirm = function () {
    const comment = ($('#resolve-comment')?.value || '').trim();
    if (comment.length < 5) { showToast('El comentario de resolución es obligatorio (mínimo 5 caracteres).'); return; }
    const ctx = store.resolveCtx;
    store.resolved[ctx.key] = true;
    audit('Movimiento compensatorio', `${ctx.key} · ${comment}`);
    store.modal = null; store.resolveCtx = null;
    showToast(`${ctx.key.replace('b', '')}: ${ctx.result}`, 'Se registró un movimiento compensatorio; el registro original se conserva.');
  };

  // -----------------------------------------------------------------------
  // RF-14 — Escaneo de salida: "Finalizar surtido" abre modal y pasa a Surtida.
  // -----------------------------------------------------------------------
  window.finishSurtido = function () { store.modal = 'finish-surtido'; render(); };
  window.finishSurtidoConfirm = function () {
    const o = store.orders.find(x => x.id === 'OS-2026-0318');
    if (o) o.estado = 'Surtida';
    audit('Finalizar surtido', 'OS-2026-0318');
    store.modal = null;
    showToast('Surtido finalizado.', 'La orden OS-2026-0318 pasó a estatus Surtida.');
  };
  window.finishDevolucion = function () { store.modal = 'finish-devolucion'; render(); };
  window.finishDevolucionConfirm = function () {
    audit('Finalizar devolución', 'EVT-58213 · 5 botellas');
    store.modal = null;
    showToast('Devolución finalizada.', '5 botellas reingresadas · costo devuelto US$ 124.00.');
  };

  // Inserta el botón "Finalizar surtido" en la pantalla de escaneo de salida.
  const scanBase = window.scan;
  window.scan = function (mode) {
    let html = scanBase(mode);
    // El botón ya existe en patch4 (clase finish-scan) pero sin acción: lo cableamos.
    html = html.replace('<button class="btn primary finish-scan">Finalizar surtido</button>',
      `<button class="btn primary finish-scan" onclick="finishSurtido()">${I('check-check')} Finalizar surtido</button>`);
    html = html.replace('<button class="btn primary finish-scan">Finalizar devolución</button>',
      `<button class="btn primary finish-scan" onclick="finishDevolucion()">${I('check-check')} Finalizar devolución</button>`);
    return html;
  };

  // -----------------------------------------------------------------------
  // Enrutamiento: inserta las páginas nuevas en generic().
  // -----------------------------------------------------------------------
  const genericBase = window.generic;
  window.generic = function (page) {
    if (page === 'grupos') return groupsPage();
    if (page === 'tipos') return typesPage();
    if (page === 'proveedores') return suppliersPage();
    if (page === 'supplier-detail') return supplierDetailPage();
    if (page === 'solicitantes') return requestersPage();
    if (page === 'requester-detail') return requesterDetailPage();
    if (page === 'auditoria') return audit_view();
    if (page === 'roles') return rolesPagePersistent();
    return genericBase(page);
  };

  // Modal RF-02: aviso de cambios sin guardar.
  const overlayBase2 = window.overlay;
  window.overlay = function () {
    let html = overlayBase2();
    if (store.modal === 'perm-unsaved') {
      html += `<div class="modal-backdrop"><div class="modal"><h2>Tienes cambios sin guardar</h2><p>Si cambias de rol perderás los cambios en la matriz de ${esc(store.permDraft ? store.permDraft.role : '')}.</p><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Seguir editando</button><button class="btn danger" onclick="store.permDraft=null;store.selectedRole=store.pendingRole;store.modal=null;render()">Descartar y cambiar</button></div></div></div>`;
    }
    if (store.modal === 'resolve') {
      const ctx = store.resolveCtx || {};
      html += `<div class="modal-backdrop"><div class="modal"><div class="drawer-head"><div><span class="eyebrow">Resolución controlada</span><h2>${esc(ctx.title || 'Resolver')}</h2></div><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div><p>Esta acción registra un movimiento compensatorio. El registro original se conserva. El comentario es obligatorio.</p><label class="field full"><span>Comentario</span><textarea id="resolve-comment" class="input" minlength="5" maxlength="300" placeholder="Describe cómo se resuelve"></textarea></label><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Cancelar</button><button class="btn primary" onclick="resolveConfirm()">Confirmar resolución</button></div></div></div>`;
    }
    if (store.modal === 'finish-surtido') {
      html += `<div class="modal-backdrop"><div class="modal"><div class="drawer-head"><h2>Finalizar surtido</h2><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div><p>Confirmas que la orden OS-2026-0318 quedó completamente surtida. Pasará a estatus <strong>Surtida</strong>.</p><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Volver</button><button class="btn primary" onclick="finishSurtidoConfirm()">Finalizar surtido</button></div></div></div>`;
    }
    if (store.modal === 'finish-devolucion') {
      html += `<div class="modal-backdrop"><div class="modal"><div class="drawer-head"><h2>Finalizar devolución</h2><button class="close" onclick="store.modal=null;render()">${I('x')}</button></div><p>Confirmas el reingreso de <strong>5 botellas</strong> del evento. Costo devuelto <strong>US$ 124.00</strong>.</p><div class="button-row" style="justify-content:flex-end"><button class="btn" onclick="store.modal=null;render()">Volver</button><button class="btn primary" onclick="finishDevolucionConfirm()">Finalizar devolución</button></div></div></div>`;
    }
    return html;
  };

  // -----------------------------------------------------------------------
  // Limpieza — elementos que NO están en el RFP.
  // -----------------------------------------------------------------------

  // 4. Quitar el sello "Bitácora protegida contra alteración" de Auditoría.
  //    (audit_view ya se reescribió sin el sello; nada que hacer aquí.)

  // 3. Quitar "¿Te fue útil?" del Asistente IA.
  const iaBase = window.ia;
  window.ia = function () {
    return iaBase()
      .replace(/<button class="btn">¿Te fue útil\?[^<]*<\/button>/g, '')
      .replace(/¿Te fue útil\? Sí/g, '');
  };

  // 6 y 7. Inicio: accesos rápidos a los módulos (navegación/usabilidad, RNF-01).
  //    Sin KPIs, números, gráficas ni widgets de analítica. Solo tarjetas que
  //    navegan a cada módulo, filtradas por los permisos del rol activo
  //    (mismo criterio que el menú lateral: allowed(ruta)).
  window.home = function () {
    const grupos = [
      ['Operación', [
        ['recepcion', 'package-plus', 'Recepción de lotes', 'Recibir e individualizar botellas'],
        ['escaneo', 'scan-line', 'Escaneo', 'Entradas, salidas y devoluciones por código'],
        ['asignar', 'map-pin', 'Asignar y ubicar', 'Resolver pendientes de ubicación'],
        ['eventos', 'calendar-days', 'Eventos', 'Gestión de eventos y asignaciones'],
        ['ordenes', 'clipboard-list', 'Órdenes de salida', 'Órdenes formales de salida'],
        ['ajustes', 'sliders-horizontal', 'Ajustes', 'Ajustes de inventario y autorizaciones'],
      ]],
      ['Inventario', [
        ['cavas', 'warehouse', 'Cavas', 'Cavas y su matriz de anaqueles'],
        ['anaqueles', 'layout-grid', 'Anaqueles', 'Anaqueles, celdas y ocupación'],
        ['vinos', 'wine', 'Vinos', 'Catálogo de vinos y presentaciones'],
        ['consultas', 'history', 'Consultas e historial', 'Buscar historia de una botella'],
      ]],
      ['Análisis', [
        ['reportes', 'chart-no-axes-column-increasing', 'Reportes', 'Reportes operativos y exportación'],
        ['ia', 'sparkles', 'Asistente IA', 'Consultas y sugerencias controladas'],
      ]],
    ];

    const secciones = grupos.map(([titulo, cards]) => {
      const visibles = cards.filter(c => allowed(c[0]));
      if (!visibles.length) return '';
      return `<section class="home-section">
        <div class="nav-group">${titulo}</div>
        <div class="home-grid">${visibles.map(([ruta, icono, nombre, desc]) => `
          <button class="module-card" onclick="goto('${ruta}')">
            <span class="module-card-head">${I(icono)}${nombre}</span>
            <span class="muted">${desc}</span>
          </button>`).join('')}</div>
      </section>`;
    }).join('');

    return `<div class="page">${pageHead('Inicio', 'Sistema de Administración de Cavas de Sigma Foods.')}
      ${secciones || '<div class="card"><p class="muted">No hay módulos disponibles para tu rol.</p></div>'}
    </div>`;
  };

  // -----------------------------------------------------------------------
  // RF-05 — Ubicaciones de origen: edición real, selectores dependientes y copy.
  // Sobrescribe los handlers definidos en improvements.js.
  // -----------------------------------------------------------------------
  function originCountries() { return (store.originData['Países'] || []).map(v => v[0]); }
  function originRegionsOf(country) { return (store.originData['Regiones'] || []).filter(v => v[1] === country).map(v => v[0]); }

  // Selectores dependientes reactivos.
  window.originCountryChange = function (selectEl) {
    const form = selectEl.closest('form');
    const regionSel = form.querySelector('[name="region"]');
    if (regionSel) {
      const regs = originRegionsOf(selectEl.value);
      regionSel.innerHTML = regs.map(r => `<option>${esc(r)}</option>`).join('') || '<option value="">(sin regiones)</option>';
    }
  };

  function originFormFields(tab, data) {
    // data: valores precargados o null
    const name = data ? data[0] : '';
    if (tab === 'Países') {
      return `<label class="field full"><span>Nombre</span><input class="input" name="name" required value="${esc(name)}"></label>`;
    }
    if (tab === 'Regiones') {
      const country = data ? data[1] : originCountries()[0];
      return `<label class="field full"><span>Nombre</span><input class="input" name="name" required value="${esc(name)}"></label>
        <label class="field full"><span>País</span><select class="select" name="parent">${originCountries().map(c => `<option ${c === country ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
    }
    // Subregiones: país -> región dependiente
    const country = data ? data[2] : originCountries()[0];
    const region = data ? data[1] : originRegionsOf(country)[0];
    return `<label class="field full"><span>Nombre</span><input class="input" name="name" required value="${esc(name)}"></label>
      <label class="field"><span>País</span><select class="select" name="country" onchange="originCountryChange(this)">${originCountries().map(c => `<option ${c === country ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="field"><span>Región</span><select class="select" name="region">${originRegionsOf(country).map(r => `<option ${r === region ? 'selected' : ''}>${esc(r)}</option>`).join('') || '<option value="">(sin regiones)</option>'}</select></label>`;
  }

  // Copy correcto: "Nuevo país" / "Nueva región" / "Nueva subregión".
  function originSingular(tab) {
    return { 'Países': 'Nuevo país', 'Regiones': 'Nueva región', 'Subregiones': 'Nueva subregión' }[tab];
  }

  window.originNewForm = function () {
    const tab = store.originTab;
    store.originEditIdx = null;
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Nuevo registro</span><h2>${originSingular(tab)}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();saveOriginNew(event)"><div class="form-grid">${originFormFields(tab, null)}</div><div class="drawer-footer"><button type="button" class="btn" onclick="store.drawer=null;render()">Cancelar</button><button class="btn primary">Guardar</button></div></form>`;
    render();
  };

  window.saveOriginNew = function (event) {
    const fd = new FormData(event.target), tab = store.originTab, name = fd.get('name').trim();
    const value = tab === 'Países' ? [name, 0, 0] : tab === 'Regiones' ? [name, fd.get('parent'), 0, 0] : [name, fd.get('region'), fd.get('country'), 0];
    store.originData[tab].unshift(value);
    audit('Crear ubicación de origen', `${tab} · ${name}`);
    store.drawer = null;
    showToast(`${originSingular(tab)} guardado.`, `${name} aparece al inicio de la tabla.`);
  };

  // Detalle con opción de editar y dar de baja.
  window.originDetailNew = function (id) {
    const [tab, idx] = id.split('-'), value = store.originData[tab][Number(idx)], lig = value[value.length - 1];
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Detalle</span><h2>${esc(value[0])}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <div class="form-grid"><div class="field"><label>Vinos ligados</label><strong>${lig}</strong></div><div class="field"><label>Estado</label>${status(value.estado || 'Activo')}</div></div>
      <p class="muted">Este registro tiene historial. Se dará de baja sin borrar su historia.</p>
      <div class="drawer-footer"><button class="btn danger" onclick="originDeactivate('${tab}',${idx})">${I('archive')} Dar de baja</button><button class="btn primary" onclick="originEdit('${tab}',${idx})">${I('pencil')} Editar</button></div>`;
    render();
  };

  window.originEdit = function (tab, idx) {
    const value = store.originData[tab][idx];
    store.drawer = `<div class="drawer-head"><div><span class="eyebrow">Edición</span><h2>${esc(value[0])}</h2></div><button class="close" onclick="store.drawer=null;render()">${I('x')}</button></div>
      <form onsubmit="event.preventDefault();originSaveEdit('${tab}',${idx})"><div class="form-grid">${originFormFields(tab, value)}</div><div class="drawer-footer"><button type="button" class="btn" onclick="originDetailNew('${tab}-${idx}')">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`;
    render();
  };

  window.originSaveEdit = function (tab, idx) {
    const fd = new FormData(event.target), value = store.originData[tab][idx];
    value[0] = fd.get('name').trim();
    if (tab === 'Regiones') value[1] = fd.get('parent');
    if (tab === 'Subregiones') { value[1] = fd.get('region'); value[2] = fd.get('country'); }
    audit('Editar ubicación de origen', `${tab} · ${value[0]}`);
    store.drawer = null;
    showToast('Ubicación actualizada.', `${value[0]} se guardó con sus cambios.`);
  };

  // -----------------------------------------------------------------------
  // RF-20 — Consultas e historial: búsqueda multicriterio.
  // -----------------------------------------------------------------------
  // Dataset demostrativo de botellas consultables por varios criterios.
  store.bottleIndex = store.bottleIndex || [
    { code: 'BOT-0061-009', vino: 'Santo Tomás Único', lote: 'LT-2024-0061', cava: 'CAV-01', anaquel: 'AN-04', ubicacion: 'J3', proveedor: 'Vinos Selectos del Norte', evento: 'Cena del Consejo de Administración', solicitante: 'Mariana Treviño Garza', fecha: '2024-03-14', estado: 'Ubicada' },
    { code: 'BOT-0142-006', vino: 'Casa Madero 3V', lote: 'LT-2026-0142', cava: 'CAV-01', anaquel: 'AN-04', ubicacion: 'E6', proveedor: 'Vinos Selectos del Norte', evento: '', solicitante: '', fecha: '2026-10-13', estado: 'Ubicada' },
    { code: 'BOT-0045-012', vino: 'Monte Xanic Gran Ricardo', lote: 'LT-2025-0045', cava: 'CAV-02', anaquel: 'AN-01', ubicacion: 'B2', proveedor: 'Casa Vinícola Peninsular', evento: 'Visita de clientes Europa', solicitante: 'Sofía Paredes León', fecha: '2025-06-02', estado: 'Fuera de cava' },
    { code: 'BOT-0103-008', vino: 'Casa Madero 2V', lote: 'LT-2024-0103', cava: 'CAV-03', anaquel: 'AN-02', ubicacion: 'A1', proveedor: 'Importadora Gourmet del Bajío', evento: 'Comida Comité de Finanzas', solicitante: 'Héctor Ibarra Núñez', fecha: '2024-11-20', estado: 'Ubicada' },
    { code: 'BOT-0098-011', vino: 'L.A. Cetto Nebbiolo Reserva', lote: 'LT-2023-0098', cava: 'CAV-01', anaquel: 'AN-04', ubicacion: 'L5', proveedor: 'Vinos Selectos del Norte', evento: '', solicitante: '', fecha: '2023-09-15', estado: 'Inconsistencia' },
    { code: 'BOT-0112-019', vino: 'Casa Madero Gran Reserva Tinto', lote: 'LT-2024-0112', cava: 'CAV-01', anaquel: 'AN-05', ubicacion: 'D4', proveedor: 'Importadora Gourmet del Bajío', evento: 'Cierre trimestral Q3', solicitante: 'Héctor Ibarra Núñez', fecha: '2024-10-01', estado: 'Ubicada' }
  ];

  const queryFields = [['code', 'Código'], ['vino', 'Vino'], ['lote', 'Lote'], ['cava', 'Cava'], ['anaquel', 'Anaquel'], ['ubicacion', 'Ubicación'], ['proveedor', 'Proveedor'], ['evento', 'Evento'], ['solicitante', 'Solicitante']];

  function queryRun() {
    const f = store.queryFilters || {};
    return store.bottleIndex.filter(b => {
      for (const [k] of queryFields) { if (f[k] && !String(b[k]).toLowerCase().includes(f[k].toLowerCase())) return false; }
      if (f.from && b.fecha < f.from) return false;
      if (f.to && b.fecha > f.to) return false;
      return true;
    });
  }

  window.queries = function () {
    store.queryFilters = store.queryFilters || {};
    const f = store.queryFilters;
    // Permite que la búsqueda global (topbar) precargue el código.
    if (store.filters.query && !f._seeded) { f.code = store.filters.query; f._seeded = true; }
    const results = queryRun();
    const sel = results[store.querySelected || 0] || results[0];
    const criteria = `<div class="card"><div class="form-grid">
      ${queryFields.map(([k, label]) => `<label class="field"><span>${label}</span>${['cava', 'anaquel', 'proveedor'].includes(k)
        ? `<select class="select" onchange="querySet('${k}',this.value)"><option value="">Todos</option>${[...new Set(store.bottleIndex.map(b => b[k]).filter(Boolean))].map(v => `<option ${f[k] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`
        : `<input class="input" value="${esc(f[k] || '')}" oninput="querySet('${k}',this.value)" placeholder="Cualquiera">`}</label>`).join('')}
      <label class="field"><span>Desde (fecha)</span><input class="input" type="date" value="${f.from || ''}" onchange="querySet('from',this.value)"></label>
      <label class="field"><span>Hasta (fecha)</span><input class="input" type="date" value="${f.to || ''}" onchange="querySet('to',this.value)"></label>
      </div><div class="button-row"><button class="btn" onclick="queryClear()">${I('x')} Limpiar filtros</button><span class="muted" style="margin-left:auto">${results.length} resultado(s)</span></div></div>`;

    const resultsTable = table(['Código', 'Vino', 'Lote', 'Cava', 'Anaquel', 'Ubicación', 'Estado'], results.map((b, i) => ({
      _id: i, Código: `<span class="mono">${b.code}</span>`, Vino: b.vino, Lote: `<span class="mono">${b.lote}</span>`, Cava: b.cava, Anaquel: b.anaquel, Ubicación: `<span class="mono">${b.ubicacion}</span>`, Estado: status(b.estado)
    })), 'id=>querySelect(id)');

    const detail = sel ? `<section class="card"><span class="mono">${sel.code}</span><h2>${esc(sel.vino)}</h2>${status(sel.estado)}<p>${sel.cava} › ${sel.anaquel} › ${sel.ubicacion}</p><p>Lote <span class="mono">${sel.lote}</span><br>Proveedor ${esc(sel.proveedor)}</p></section>
      <section class="card"><h2>Línea de tiempo</h2>${[[`${sel.fecha} 09:30`, 'Recepción', `${sel.lote} · ${sel.proveedor}`], [`${sel.fecha} 12:10`, 'Entrada', `${sel.anaquel} › ${sel.ubicacion}`], ['14/10/2026 16:22', 'Asignada', sel.evento || 'Sin evento'], ['15/10/2026 17:45', 'Movimiento', sel.estado]].map(x => `<div class="activity-row"><span class="state-icon info">${I('history')}</span><div><strong>${x[1]}</strong><div>${x[2]}</div><small class="muted">${x[0]} · Ver en auditoría</small></div></div>`).join('')}</section>`
      : `<div class="empty">${I('search')}<h2>Sin resultados</h2><p>Ajusta los criterios de búsqueda.</p></div>`;

    return `<div class="page">${pageHead('Consultas e historial', 'Busca por código, vino, lote, cava, anaquel, ubicación, proveedor, evento, solicitante o fechas')}
      ${criteria}
      <div class="table-card" style="margin-top:16px">${resultsTable}</div>
      <div class="grid-2" style="margin-top:16px">${detail}</div></div>`;
  };

  window.querySet = function (k, v) { store.queryFilters = store.queryFilters || {}; store.queryFilters[k] = v; store.querySelected = 0; render(); };
  window.queryClear = function () { store.queryFilters = { _seeded: true }; store.filters.query = ''; store.querySelected = 0; render(); };
  window.querySelect = function (i) { store.querySelected = i; render(); };

  // -----------------------------------------------------------------------
  // RF-21 — Reportes: filtros que filtran en línea; export respeta lo filtrado.
  // -----------------------------------------------------------------------
  // Columna de "cava" / "fecha" por reporte para filtrar.
  function reportFilterRows(key, rows, headers) {
    const f = store.reportFilters || {};
    const cava = f.cava || '';
    const period = f.period || '';
    return rows.filter(r => {
      const text = r.join(' ');
      if (cava && !text.includes(cava)) return false;
      if (period === 'Añada 2018' && !text.includes('2018')) return false;
      if (period === 'Añada 2019' && !text.includes('2019')) return false;
      return true;
    });
  }

  window.reportSet = function (k, v) { store.reportFilters = store.reportFilters || {}; store.reportFilters[k] = v; render(); };

  // Export que respeta el filtrado actual.
  window.exportReportFiltered = function () {
    const d = reportData[store.report];
    const filtered = reportFilterRows(store.report, d.rows, d.headers);
    const rows = filtered.map(r => Object.fromEntries(d.headers.map((h, j) => [h, r[j]])));
    exportXlsx(d.name, d.headers, rows);
  };

  window.reports = function () {
    if (!reportData.R4.rows.length) reportData.R4.rows = store.adjustments.map(a => [a.id, a.tipo, a.motivo, a.estado, a.impacto]);
    const d = reportData[store.report];
    const f = store.reportFilters || {};
    const cavaOptions = ['', 'CAV-01', 'CAV-02', 'CAV-03', 'Cava Corporativa'];
    const filtered = reportFilterRows(store.report, d.rows, d.headers);
    const rows = filtered.map((r, i) => Object.assign({ _id: i }, Object.fromEntries(d.headers.map((h, j) => [h, (!roleCanSeeCost() && /Costo|Valor/.test(h)) ? 'Sin permiso' : r[j]]))));
    return `<div class="page">${pageHead('Reportes', 'Siete reportes operativos con exportación trazable')}
      <div class="report-picker">${Object.entries(reportData).map(([k, v]) => `<button class="report-option ${store.report === k ? 'active' : ''}" onclick="store.report='${k}';render()"><span class="eyebrow">${k}</span><br>${v.name}</button>`).join('')}</div>
      <div class="card" style="margin-bottom:16px"><div class="toolbar" style="padding:0;border:0">
        <select class="select" onchange="reportSet('cava',this.value)"><option value="">Todas las cavas</option>${cavaOptions.filter(Boolean).map(c => `<option ${f.cava === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <select class="select" onchange="reportSet('period',this.value)"><option value="">Todas las añadas</option><option ${f.period === 'Añada 2018' ? 'selected' : ''}>Añada 2018</option><option ${f.period === 'Añada 2019' ? 'selected' : ''}>Añada 2019</option></select>
        <button class="btn" onclick="store.reportFilters={};render()">Limpiar</button>
        <span class="muted" style="margin-left:auto">${filtered.length} de ${d.rows.length} filas</span>
      </div></div>
      <div class="table-card"><div class="toolbar"><strong>${d.name}</strong><span class="muted">Corte 13/10/2026 09:15</span><button class="btn" style="margin-left:auto" onclick="exportReportFiltered()">${I('download')} Exportar XLSX</button></div>${table(d.headers, rows)}</div></div>`;
  };

  // -----------------------------------------------------------------------
  // Mantener sincronizada la columna Grupos de Vinos al cargar.
  syncWineGroups();

})();
