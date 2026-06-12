# Diseño de Ajustes de Desbordamiento y Visibilidad de Botones de Edición

Este documento detalla la solución de diseño para corregir el desbordamiento vertical de la pantalla de bienvenida (landing) en el tema Gaming, ocultar el botón de edición cuando las fichas están colapsadas y evitar el truncamiento de las etiquetas.

## Requerimientos y Diseño

1. **Pantalla de Bienvenida (Landing Selection View) en Tema Gaming (`foto1`)**:
   - El contenedor de la landing page y el contenedor de página principal en `PetPlantDashboard.tsx` tienen un alto forzado de `100svh` con `overflow: 'hidden'`.
   - Cuando el tamaño de pantalla es bajo o se usa el tema Gaming (con tipografía ancha *Orbitron*), los elementos se cortan arriba y abajo.
   - **Solución**: Remover la restricción de alto fijo `100svh` en la landing page y cambiar `overflow: 'hidden'` a `overflow: 'visible'` (o permitir scroll vertical). Se usará `minHeight: '100vh'` y padding adicional arriba/abajo para permitir scrolling nativo si el contenido excede el alto físico de la pantalla, previniendo cualquier recorte visual.

2. **Visibilidad del Botón de Edición (Lápiz) (`foto2`)**:
   - El botón de edición `✏️` actualmente se muestra incondicionalmente en la cabecera, incluso cuando la ficha está colapsada.
   - **Solución**: Modificar `PetCard.tsx`, `PlantCard.tsx` y `ExoticCard.tsx` para que el lápiz de edición solo se renderice si la ficha está expandida (`expanded` o `isExpanded` es verdadero). Esto reduce el ruido visual en la vista colapsada y proporciona más espacio para la cabecera.

3. **Etiquetas de Ficha Cortadas en PetCard (`foto2`)**:
   - En móviles, el badge de castración o sexo se corta debido a la propiedad `flexWrap: 'nowrap'` y `overflowX: 'auto'` en el contenedor de etiquetas de `PetCard.tsx`.
   - **Solución**: Cambiar `flexWrap: 'nowrap'` a `flexWrap: 'wrap'` en la cabecera de `PetCard.tsx`. Al haber eliminado las etiquetas de raza y chip del encabezado en el cambio anterior, solo quedan las etiquetas de sexo y castración, las cuales se mantendrán limpias y, si el ancho es crítico en móviles pequeños, se envolverán automáticamente en una segunda línea corta en lugar de cortarse visualmente.

## Cambios Propuestos

### 1. `PetPlantDashboard.tsx` (Landing Page Layout)
- Quitar la restricción `height`/`maxHeight`/`overflow` del contenedor principal cuando `experienceMode === 'landing'`.
- Modificar el div principal de la landing page en `experienceMode === 'landing'` (alrededor de la línea 1090) para usar `minHeight: 'calc(100vh - 24px)'`, `overflow: 'visible'`, y añadir padding vertical `padding: '24px 10px 32px 10px'`.

### 2. `PetCard.tsx`, `PlantCard.tsx`, `ExoticCard.tsx` (Botón de Lápiz)
- Envolver el botón `✏️` con `{expanded && ( ... )}` (o `{isExpanded && ( ... )}`) en los tres archivos de fichas.

### 3. `PetCard.tsx` (Envoltura de Etiquetas)
- Cambiar el estilo del contenedor de etiquetas de cabecera en `PetCard.tsx` para usar `flexWrap: 'wrap'` y remover `overflowX: 'auto'` y `whiteSpace: 'nowrap'`.

## Plan de Verificación

1. **Landing en Tema Gaming**: Cambiar al tema Gaming en el panel de Ajustes, volver a la pantalla de bienvenida y verificar que el título superior ("PET & PLANT PRO") y la tarjeta de exóticos inferior se muestren completamente (con scroll vertical suave habilitado).
2. **Lápiz de Edición**: Comprobar que en las tres secciones (Mascotas, Plantas, Exóticos), el lápiz de edición `✏️` no sea visible cuando las tarjetas estén colapsadas, y que aparezca normalmente al expandir la tarjeta.
3. **Etiquetas Completas**: Reducir el ancho de pantalla en móviles y comprobar que el texto "Sin castrar" o "Castrado/a" se lea completamente de principio a fin sin recortarse.
