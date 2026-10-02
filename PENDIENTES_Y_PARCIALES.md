# Pendientes y funcionalidades parciales

## Prototipo Sistema de Administración de Cavas, Sigma Foods

**Fecha de validación:** 02/10/2026  
**Ambiente validado:** https://juanlebrijasofttek.github.io/SIGMA-FOODS/  
**Criterio:** Se considera cumplido solo un requerimiento que pueda recorrerse de principio a fin en la interfaz publicada, con datos coherentes, navegación funcional y actualización visible del estado compartido.

## Resumen ejecutivo

El prototipo cubre visualmente la mayoría de módulos y demuestra varios flujos clave. Sin embargo, no todos los requerimientos están terminados de extremo a extremo. Se deben atender principalmente los catálogos administrables, los detalles operativos, la persistencia visible de cambios en memoria, las validaciones obligatorias y los defectos visuales señalados.

| Prioridad | Requerimientos | Motivo principal |
|---|---|---|
| Alta | RF-06, RF-07, RF-08, RF-18, RF-23 | Flujos administrables o de auditoría incompletos. |
| Alta | RF-03, RF-04 | Defectos visuales reportados en Cavas y Anaqueles. |
| Media | RF-13 a RF-17, RF-19 a RF-22, RF-24 | Existen vistas y casos demostrativos, pero faltan flujos completos, persistencia o verificaciones por acción. |
| Media | RF-01, RF-02, RF-05, RF-09 a RF-12 | Funcionalidad parcialmente demostrada, con cobertura pendiente para todos los casos. |

## Pendientes por requerimiento

### RF-01. Autenticación y sesión

**Estado:** Parcial.

**Existe:**
- Login con selector simulado de cuentas Microsoft Entra ID.
- Selección de usuarios por rol.
- Usuario inactivo con mensaje de bloqueo.
- Cierre de sesión y opción de simular expiración.

**Pendiente:**
- Hacer visible y comprobable la pestaña de Auditoría para accesos, incluyendo inicio exitoso, fallido, usuario inactivo, expiración y cierre de sesión.
- Confirmar que cada evento de sesión se agrega a la auditoría y permanece visible al navegar.
- Comprobar el cierre automático al vencer la sesión simulada, no solo el botón manual.

### RF-02. Roles y permisos

**Estado:** Parcial.

**Existe:**
- Selector de seis roles.
- Matriz con siete acciones: Ver, Crear, Editar, Dar de baja, Autorizar, Exportar y Ver costos.
- La matriz cambia al seleccionar un rol.

**Pendiente:**
- Persistir los cambios de la matriz en el estado compartido al guardar.
- Reflejar inmediatamente cada permiso actualizado en sidebar, botones, costos y acciones protegidas.
- Implementar aviso de cambios sin guardar al seleccionar otro rol.
- Confirmar que desmarcar Ver desmarca las demás acciones del módulo.

### RF-03. Cavas

**Estado:** Parcial.

**Existe:**
- Listado de cavas, buscador, exportación, alta y detalle con anaqueles.
- Navegación desde CAV-01 hasta la matriz de AN-04.

**Pendiente:**
- Corregir el defecto visual reportado en la pantalla de Cavas.
- Validar edición completa, actualización de breadcrumb y registro de antes y después en Auditoría.
- Validar baja lógica con motivo para una cava sin botellas y bloqueo para una cava con inventario.
- Confirmar que Nueva cava crea CAV-04, muestra el CTA Agregar anaquel y conserva el nuevo registro en todas las vistas.

### RF-04. Anaqueles y celdas

**Estado:** Parcial.

**Existe:**
- Listado de anaqueles y matrices por anaquel.
- Navegación a la matriz de AN-04.
- Estados visuales de ocupación, consumo e inconsistencia.

**Pendiente:**
- Corregir el defecto visual arriba del botón Nuevo anaquel.
- Validar que los trece anaqueles abran su propia matriz, incluso claves repetidas entre cavas.
- Completar asistente de Nuevo anaquel con dos pasos, vista previa y actualización de capacidad de la cava.
- Confirmar reglas de reducción de filas, baja por inventario y prevención de doble ocupación en todas las acciones.

### RF-05. Ubicaciones de origen

**Estado:** Parcial mejorado.

**Existe:**
- Pestañas Países, Regiones y Subregiones.
- Conteos visibles: 5 países, 9 regiones y 11 subregiones.
- Drawer de alta.
- Detalle y baja lógica de Tequisquiapan.

**Pendiente:**
- Implementar edición real del registro desde su detalle, con formulario precargado.
- Mostrar todos los datos y vinos ligados relevantes en el drawer de detalle.
- Implementar selectores dependientes de país, región y subregión.
- Confirmar que Mostrar inactivos filtra el listado.
- Confirmar que la exportación contiene exactamente las filas visibles filtradas.

### RF-06. Grupos y tipos de vino

**Estado:** Parcial, prioridad alta.

**Hallazgo validado en producción:**
- Grupos de vino muestra únicamente las columnas Nombre, Detalle y Ligados.
- No muestra las columnas requeridas: Orden, Grupo, Comentarios, Vinos ligados y Estado.
- El botón Nuevo no abrió drawer ni modal durante la validación.
- No existe administración visible de orden, comentarios o relación muchos a muchos con vinos.

**Pendiente:**
- Crear página de Grupos con las cinco columnas requeridas.
- Implementar Nuevo grupo con campos Nombre, Orden y Comentarios.
- Implementar drawer de detalle con lista de vinos y casillas de selección múltiple.
- Actualizar el número de Vinos ligados y la columna Grupos de la pantalla Vinos al ligar o desligar vinos.
- Implementar subir y bajar para reordenar, con renumeración.
- Garantizar que Tipos de vino tenga alta, detalle, edición y baja bloqueada cuando tenga vinos ligados.

### RF-07. Proveedores y contactos

**Estado:** Parcial, prioridad alta.

**Existe:**
- Listado de proveedores con ciudad, lotes y datos resumidos.

**Pendiente:**
- Implementar Nuevo proveedor mediante drawer real y validaciones de campos obligatorios.
- Incluir dirección, ciudad, teléfono, correo válido, comentarios y contacto principal.
- Crear detalle con bloques Datos, Contactos y Lotes.
- Implementar Agregar contacto en línea y actualizar el conteo de contactos en la tabla.
- Mostrar los dos contactos de Vinos Selectos del Norte y sus catorce lotes recibidos.

### RF-08. Solicitantes

**Estado:** Parcial, prioridad alta.

**Existe:**
- Listado con solicitantes, área y métricas básicas.

**Pendiente:**
- Implementar Nuevo solicitante con drawer real, no solo confirmación visual.
- Capturar nombre, puesto, área, correo válido, teléfono, estado y comentarios.
- Crear detalle con Datos, Eventos y Órdenes.
- Aplicar el estado Activo o Inactivo en los selectores de Eventos.
- Permitir edición de estado y conservar los cambios en las vistas relacionadas.

### RF-09. Vinos y presentaciones

**Estado:** Parcial.

**Existe:**
- Tabla de vinos, ficha de vino, pestañas de presentaciones, existencias, lotes e historial.

**Pendiente:**
- Validar las diez fichas, no solo la de Santo Tomás Único.
- Asegurar que las existencias por añada sumen lo mismo que el listado de vinos.
- Completar alta de vino con origen dependiente, grupos múltiples y al menos una presentación.
- Completar Agregar presentación y su actualización en catálogo y ficha.
- Validar baja bloqueada cuando el vino tiene existencias.

### RF-10. Recepción y preentrada de lotes

**Estado:** Parcial.

**Existe:**
- Captura de proveedor, lote, fecha, remisión y líneas de vino.
- Secciones de botellas generadas y etiquetas tras confirmar recepción.

**Pendiente:**
- Confirmar todas las validaciones por línea: cantidad, añada, consumir antes de y costo.
- Hacer funcional Agregar línea con los diez campos requeridos.
- Confirmar que la recepción actualice Preentradas, botellas, Consultas, Auditoría y Por ubicar.
- Verificar que no exista stepper en la pantalla final.

### RF-11. Individualización de botellas

**Estado:** Parcial.

**Existe:**
- Listado de BOT-0142-001 a BOT-0142-036 en la recepción demostrativa.

**Pendiente:**
- Crear cada botella como registro individual persistente dentro del estado compartido.
- Mostrar estado, lote, vino, presentación y atributos en su ficha.
- Confirmar que las botellas sean consultables desde códigos y líneas de tiempo.

### RF-12. Etiquetas

**Estado:** Parcial.

**Existe:**
- Vista de etiqueta, código de barras, QR, bloque ZPL y acciones visuales de impresión.

**Pendiente:**
- Implementar selector de botella y opciones Todo el lote, Rango e Individual.
- Generar descarga real de ZPL para la selección.
- Generar PDF descargable real.
- Registrar historial de impresiones con usuario, fecha, cantidad y motivo.
- Completar las pestañas Por lote, Por código y Plantillas de la pantalla Etiquetas.

### RF-13. Entradas por escaneo

**Estado:** Parcial.

**Existe:**
- Campo de escaneo, códigos de ejemplo y mensajes válido, advertencia y bloqueado.

**Pendiente:**
- Implementar selección exacta de cava, anaquel y celda libre mediante controles funcionales o mini matriz.
- Confirmar entrada actualizando estado de botella, ocupación de celda, historial, consultas y auditoría.
- Bloquear permanentemente la selección de una celda ocupada.

### RF-14. Salidas por escaneo

**Estado:** Parcial.

**Existe:**
- Contexto de orden, evento, solicitante y motivo.
- Casos visuales de salida válida, duplicada y botella fuera de orden.

**Pendiente:**
- Guardar cada salida con código, usuario, fecha, hora, evento, orden y motivo.
- Liberar la celda en la matriz y cambiar el estado de la botella.
- Validar Finalizar surtido y transición de la orden a Surtida.
- Mantener el bloqueo de duplicados después de cambiar de pantalla.

### RF-15. Sobrantes y devoluciones

**Estado:** Parcial.

**Existe:**
- Pestaña Devolución.
- Validación confirmada: BOT-0142-005 se bloquea porque no tiene salida registrada.

**Pendiente:**
- Implementar Confirmar reingreso con ubicación original u otra celda.
- Actualizar botella, evento, matriz, historial y auditoría de forma compartida.
- Implementar Finalizar devolución con las cinco botellas y costo devuelto de US$ 124.00.

### RF-16. Asignar y ubicar

**Estado:** Parcial.

**Existe:**
- Pestañas para Preentradas, Entradas por ubicar, Salidas sin evento e Inconsistencias.

**Pendiente:**
- Implementar drawers y modales de confirmación con comentario obligatorio para cada resolución.
- Sacar registros resueltos de su pestaña y actualizar contadores.
- Registrar el movimiento compensatorio en Consultas y Auditoría.
- Retirar elementos fuera de alcance: alerta de antigüedad de 12 años y bloque Antes / Después propuesto en inconsistencias.

### RF-17. Ajustes de inventario

**Estado:** Parcial.

**Existe:**
- Listado, tabs por estado y datos de ajustes de ejemplo.

**Pendiente:**
- Implementar Nuevo ajuste con escaneo, motivo, comentario de mínimo veinte caracteres y evidencia obligatoria para merma.
- Mostrar panel de impacto calculado antes de enviar.
- Implementar autorización o rechazo con comentario y transición de pestañas.
- Actualizar existencia, celda, historial y auditoría después de autorizar.

### RF-18. Eventos

**Estado:** Parcial, prioridad alta.

**Existe:**
- Listado de siete eventos y creación básica de evento.

**Pendiente:**
- Asegurar que cada fila abre su detalle propio.
- Implementar detalle completo con acceso, comentarios, origen, métricas, desglose de vinos, órdenes e historial.
- Implementar edición con campos bloqueados para eventos vinculados.
- Implementar cancelación con motivo obligatorio y liberación de botellas no surtidas.
- Implementar vínculo desde Sistema de Eventos mediante modal y resultados simulados.

### RF-19. Órdenes de salida

**Estado:** Parcial.

**Existe:**
- Listado de órdenes, detalle básico y datos de OS-2026-0318.

**Pendiente:**
- Implementar asistente de cuatro pasos con navegación Anterior y Siguiente.
- Validar disponibilidad de vinos y bloqueo por excedente.
- Implementar autorización con segregación de funciones.
- Generar PDF real con folio, solicitante, motivo, ubicaciones, firmas y QR.
- Actualizar línea de tiempo de estatus y transiciones de orden.

### RF-20. Consultas e historial

**Estado:** Parcial.

**Existe:**
- Vista de BOT-0061-009 y línea de tiempo demostrativa.

**Pendiente:**
- Implementar búsqueda multicriterio real por todos los campos solicitados.
- Hacer que resultados y ficha correspondan a la consulta ejecutada.
- Enlazar cada movimiento con su detalle de Auditoría.

### RF-21. Reportes

**Estado:** Parcial.

**Existe:**
- Catálogo de siete reportes y tablas de ejemplo.

**Pendiente:**
- Hacer funcionales los filtros específicos de cada reporte.
- Implementar columnas opcionales y Guardar filtros con chips persistentes.
- Asegurar totales correctos y costos ocultos por permiso.
- Validar Exportar XLSX con las filas visibles de cada reporte.

### RF-22. Exportaciones

**Estado:** Parcial.

**Existe:**
- Librería SheetJS cargada.
- Acción de exportación XLSX y registro visual en bitácora.

**Pendiente:**
- Aplicar exportación a todos los listados y reportes.
- Exportar solo las filas filtradas y visibles.
- Registrar usuario, filtros, filas y formato en Bitácora de exportaciones.
- Ocultar o deshabilitar la acción por permiso con tooltip requerido.

### RF-23. Auditoría

**Estado:** Parcial, prioridad alta.

**Existe:**
- Listado de auditoría y sello de integridad.

**Pendiente:**
- Corregir el defecto visual reportado.
- Hacer funcionales las pestañas Movimientos y cambios, Accesos y Exportaciones.
- Implementar drawer de detalle con antes y después, hora local, UTC, correlación, origen y resultado.
- Enlazar entidades desde movimientos, órdenes, ajustes y botellas.
- Retirar el sello de integridad si se desea ceñirse estrictamente al alcance del RFP, ya que es funcionalidad adicional.

### RF-24. Asistente IA

**Estado:** Parcial.

**Existe:**
- Banner de gobernanza, conversación de ejemplo, sugerencia de vinos, fuentes, filtros de permiso y limitaciones.

**Pendiente:**
- Implementar consultas de ejemplo interactivas y guardrail de no modificación de registros.
- Registrar la interacción en Registro de IA con usuario, fuentes, latencia, tokens, costo, resultado y retroalimentación.
- Hacer funcional Crear borrador de orden de salida, con precarga y confirmación humana.
- Retirar la retroalimentación ¿Te fue útil? si se busca limitarse estrictamente al RFP, pues es funcionalidad adicional.

## Elementos fuera del alcance del RFP que deben decidirse

Estos elementos ya se muestran en el prototipo, pero no fueron solicitados en el documento de requerimientos. Se debe decidir si se conservan como valor agregado o se eliminan para evitar comprometer alcance:

1. Aviso de antigüedad de doce años en Preentradas.
2. Bloque Antes / Después propuesto dentro de Inconsistencias.
3. Retroalimentación ¿Te fue útil? en el Asistente IA.
4. Sello de bitácora protegida e íntegra en Auditoría.
5. Línea de tiempo visual de seguimiento de una orden.
6. Inicio con KPIs y saludo narrativo.
7. Accesos rápidos del Inicio.

## Orden sugerido de implementación

1. Corregir defectos visuales de Cavas, Anaqueles y Auditoría.
2. Completar Grupos, Tipos, Proveedores y Solicitantes.
3. Completar detalle y flujos de Eventos.
4. Consolidar estado global de botellas, celdas, movimientos y auditoría.
5. Completar escaneo de entrada, salida, devolución, ajustes y asignación con actualizaciones compartidas.
6. Completar órdenes de salida, autorización y PDF.
7. Completar filtros, exportaciones y bitácora de exportaciones.
8. Completar Registro de IA y creación de borrador desde el asistente.
9. Ejecutar nuevamente la matriz de aceptación completa en escritorio, tableta y móvil.
