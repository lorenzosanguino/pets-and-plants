# Especificación de Diseño: Pet & Plant App - Calendario de Cuidados y Exportación Clínica (Fase 3)

Este documento detalla el diseño de la **Fase 3**, centrada en la implementación de una agenda interactiva semanal de cuidados (Timeline) y el sistema de exportación clínica en formato imprimible PDF para uso veterinario.

---

## 1. Mapeo Arquitectónico y Nuevos Componentes

Añadiremos y modificaremos los siguientes archivos en la estructura de `/pet-plant-app`:

- **`src/components/CareTimeline.tsx`** [NEW]: Componente que calcula y representa de forma interactiva una línea de tiempo cronológica con los cuidados requeridos para las mascotas y plantas en los próximos 7 días.
- **`src/components/PetCard.tsx`** [MODIFY]: Añade un botón `[ Exportar Registro Clínico ]` que abre una ventana con estilos de impresión optimizados (`@media print`) para generar el PDF clínico perfecto.
- **`src/pages/PetPlantDashboard.tsx`** [MODIFY]: Integra el componente `CareTimeline` en una sección lateral responsiva o panel desplegable.

---

## 2. Definición Detallada de Módulos

### 2.1 Calendario Semanal de Cuidados (`src/components/CareTimeline.tsx`)

La agenda consolida dinámicamente las tareas de cuidados calculadas a partir del estado de la base de datos local:

- **Tareas Botánicas**: Riegos pendientes y calculados a futuro en base a `proximaFechaRiego` de cada planta. Especifica el tipo de agua requerido.
- **Tareas de Medicina Preventiva**: Fechas calculadas para el control de peso continuo y próximas dosis de vacunación (`proximaDosis` en el historial vacunal).
- **Interactividad**: Cada tarea en la línea de tiempo cuenta con un botón de acción rápida para completarse (`[ Marcar Completado ]`), actualizando la base de datos local al instante y recalculando el cronograma.

---

### 2.2 Exportación de Historial Clínico de Mascota (`@media print` y PDF)

Para posibilitar la entrega física del registro al médico veterinario real:

- El botón en `PetCard` dispara un flujo de impresión nativo del navegador (`window.print()`) cargando una vista formateada del animal.
- Se implementan estilos de impresión específicos que:
  - Ocultan botones de la interfaz, barras de entrada y el dashboard principal.
  - Formatean el perfil de la mascota, el gráfico SVG de curva de peso (condición corporal) y el listado de vacunas en un formato A4 de alta legibilidad clínica.
  - Aseguran un fondo blanco puro e inyección de márgenes veterinarios estándar.

---

## 3. Plan de Verificación

1. **Integridad de Timeline**: Validar que si una planta requiere riego en 2 días, aparezca correctamente en la posición correspondiente del cronograma semanal.
2. **Acciones del Calendario**: Verificar que al marcar como completado un riego desde el Timeline, la barra de evapotranspiración de `PlantCard` y el propio Timeline se actualicen inmediatamente sin refrescar la página.
3. **Fidelidad de Impresión**: Probar en navegador la ventana de impresión para asegurar que no se muestren elementos del Dashboard y que la curva de peso SVG se imprima con vectores nítidos.
