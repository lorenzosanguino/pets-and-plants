# Diseño de Corrección de Layout en PetCard

Este documento detalla la solución de diseño para corregir la alineación del nombre, desbordamientos de etiquetas y ubicación de los botones de acción en las fichas de mascotas.

## Requerimientos y Diseño

1. **Alineación del Nombre**:
   - Forzar alineación a la izquierda (`textAlign: 'left'`) en el contenedor de texto de la cabecera de `PetCard.tsx`.
   - Añadir `flex: 1, minWidth: 0` al contenedor de cabecera izquierdo para asegurar que ocupe el espacio correcto y se estire simétricamente de forma idéntica a `ExoticCard.tsx`.

2. **Ajuste de Etiquetas (Badges)**:
   - Eliminar la etiqueta de Especie/Raza y la de Chip del encabezado de la ficha para evitar que se desborden de la pantalla en dispositivos móviles.
   - Mantener únicamente las etiquetas de **Sexo** y **Castración**.

3. **Preservación de Información**:
   - Agregar una fila de información en la vista expandida (debajo del Microchip) que muestre la raza y la especie de forma clara: `🐾 Especie y Raza: Felino (Gato Común Europeo)`.

4. **Botón de Eliminación (Papelera)**:
   - Asegurar que el botón de eliminar y las acciones de la cabecera no se salgan de la ficha.
   - Añadir `flexShrink: 0` al contenedor de botones de la cabecera para evitar que se comprima o se desplace fuera de los márgenes en pantallas muy estrechas.

## Cambios Propuestos

### Componente `PetCard.tsx`

#### Modificación del contenedor de cabecera izquierdo:
```tsx
// Antes:
<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

// Después:
<div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
```

#### Modificación del contenedor de texto:
```tsx
// Antes:
<div style={{ flex: 1, minWidth: 0 }}>

// Después:
<div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
```

#### Modificación de las etiquetas de la cabecera:
Eliminar la renderización de la etiqueta de especie/raza y la de chip del row horizontal de badges (líneas 648-658 y 669-681).

#### Adición de información en la vista expandida:
Mostrar la especie y la raza en la sección de detalles expandidos:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: '#fafafa', padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', marginTop: '4px' }}>
  <span style={{ fontWeight: 'bold' }}>🐾 Especie y Raza:</span>
  <span>{mascota.especie}{mascota.raza ? ` (${mascota.raza})` : ''}</span>
</div>
```

#### Modificación del contenedor de botones:
```tsx
// Antes:
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="no-print">

// Después:
<div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="no-print">
```

## Plan de Verificación

1. **Alineación Visual**: Comprobar que el nombre del animal ("Shasha", "Enzo", etc.) aparezca alineado a la izquierda al lado del avatar.
2. **Sin Desbordamiento**: Comprobar en resoluciones de móvil que las etiquetas de sexo y castración no se desborden de la ficha.
3. **Presencia de Datos**: Validar que la especie y la raza aparezcan de manera legible en el cuerpo expandido de la ficha.
4. **Papelera dentro de la ficha**: Expandir la ficha y comprobar que el icono de la papelera permanezca en su posición correcta dentro de la esquina superior derecha de la tarjeta, sin salirse del borde físico.
