# Diseño de Alineación de Flechas y Envoltura de Nombres a Dos Líneas

Este documento detalla la solución de diseño para alinear de forma consistente los botones de flecha (colapsar) en las tarjetas de toda la aplicación, y permitir que los nombres largos de mascotas, plantas o exóticos (junto a sus caritas Kawaii) se dividan en dos líneas en lugar de recortarse.

## Requerimientos y Diseño

1. **Alineación de Flechas e Integridad del Borde de la Tarjeta**:
   - En `PlantCard.tsx`, el contenedor de la cabecera izquierda no tiene `flex: 1`, lo que provoca que un nombre o texto largo empuje el botón de flecha fuera de los límites de la tarjeta.
   - **Solución**:
     - Homogeneizar las cabeceras de `PetCard.tsx`, `PlantCard.tsx` y `ExoticCard.tsx` aplicando `flex: 1, minWidth: 0` al contenedor izquierdo de la cabecera.
     - Aplicar `textAlign: 'left'` al contenedor de texto (`flex: 1, minWidth: 0`) para garantizar la alineación izquierda nativa frente a cualquier centrado heredado.
     - Añadir `flexShrink: 0` al contenedor de botones de acción de la derecha para asegurar que las flechas se mantengan alineadas a la derecha y nunca se desplacen o compriman.
     - Cambiar el botón de flecha en `ExoticCard.tsx` (que actualmente es un círculo con borde) por un `span` de texto idéntico al de `PetCard` y `PlantCard` (`fontSize: '20px', padding: '10px'`) para lograr una consistencia del 100% en el aspecto visual.

2. **Nombres a Dos Líneas y Adaptabilidad de Caras Kawaii**:
   - La propiedad `whiteSpace: 'nowrap'` en las cabeceras `h3` de los nombres impide el salto de línea y fuerza el recorte.
   - **Solución**:
     - Reemplazar `whiteSpace: 'nowrap'` por una regla de truncado de caja de hasta 2 líneas (`display: '-webkit-box'`, `-webkit-line-clamp: 2`, `-webkit-box-orient: vertical`, `overflow: hidden`, `word-break: break-word`).
     - Al quitar la restricción de una línea, si el nombre de la mascota/planta es muy largo, el texto y las caritas Kawaii asociadas (ej. `(◕‿◕✿)`) saltarán de forma natural a la segunda línea, evitando salirse de los márgenes o recortar el texto.

## Cambios Propuestos

### 1. `PlantCard.tsx`
- Modificar el contenedor izquierdo de la cabecera (línea 523) para añadir `flex: 1, minWidth: 0`.
- Modificar el contenedor de texto (línea 593) para añadir `textAlign: 'left'`.
- Cambiar la cabecera `h3` (línea 594) para quitar `whiteSpace: 'nowrap'` y configurar el truncado a dos líneas con `display: '-webkit-box'`.
- Añadir `flexShrink: 0` al contenedor de botones (línea 621).

### 2. `PetCard.tsx`
- Cambiar la cabecera `h3` (línea 625) para quitar `whiteSpace: 'nowrap'` y configurar el truncado a dos líneas con `display: '-webkit-box'`.

### 3. `ExoticCard.tsx`
- Modificar el contenedor de texto (línea 309) para añadir `textAlign: 'left'`.
- Cambiar la cabecera `h3` (línea 310) para quitar `whiteSpace: 'nowrap'` y configurar el truncado a dos líneas con `display: '-webkit-box'`.
- Añadir `flexShrink: 0` al contenedor de botones (línea 334).
- Cambiar el botón de colapsar circular (línea 382) por un `span` idéntico de estilo monospace:
  ```tsx
  <span style={{ fontSize: '20px', padding: '10px', color: 'var(--game-text-bright)', fontFamily: 'monospace' }}>
    {isExpanded ? '▲' : '▼'}
  </span>
  ```

## Plan de Verificación

1. **Alineación de Flechas**: Verificar que las flechas de colapsar (▲/▼) de mascotas, plantas y exóticos queden perfectamente alineadas en el margen derecho de las tarjetas, y que no sobresalgan en ninguna resolución.
2. **Nombres Largos (Dos Líneas)**: Modificar el nombre de una mascota y de una planta con un nombre largo (ej: "Planta de la Oración del Amazonas") en tema Kawaii, y validar que se visualice en dos líneas y la carita kawaii salte de línea correctamente.
3. **Consistencia Visual de la Flecha**: Comprobar que en la pestaña de exóticos la flecha de expansión no tenga borde circular y sea idéntica a la de mascotas y plantas.
