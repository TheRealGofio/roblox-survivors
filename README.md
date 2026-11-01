# r-survivors ⚔️ (Roblox Port of g-survivors2)

Prototipo inicial desarrollado con **TypeScript (`roblox-ts`)** y empaquetado para Roblox con **Rojo**.

---

## 🚀 Cómo abrir y jugar el prototipo de inmediato

1. Abre **Roblox Studio**.
2. Ve a **File** $\rightarrow$ **Open from File...** (o haz doble clic directamente en el archivo generado):
   `C:\DEV\r-survivors\r-survivors.rbxl`
3. Pulsa **Play (F5)** en Roblox Studio.

### Lo que verás en este prototipo inicial:
- **Spawner en Servidor (`src/server/main.server.ts`):** Genera dummies de enemigos con barras de vida en el Workspace cada 3 segundos.
- **Auto-Aim en Cliente (`src/client/main.client.ts`):** Detecta enemigos cercanos y les dispara automáticamente el **Búmeran del Vacío** (en color neón turquesa `#1ae5cc`).
- **Físicas del Búmeran:** Vuela girando hacia el objetivo y emprende el vuelo de retorno hacia el jugador de forma continua.
- **Base de datos compartida (`src/shared/weapons.ts`):** Port directo de las estadísticas de armas de `g-survivors2`.

---

## 🛠️ Flujo de desarrollo continuo (Live-Sync con Rojo)

Si quieres programar en TypeScript y que los cambios se reflejen en Roblox Studio al guardar:

1. En una terminal en `C:\DEV\r-survivors`:
   ```bash
   npm run watch
   ```
2. En otra terminal:
   ```bash
   npm run serve
   ```
3. En Roblox Studio, abre el plugin de **Rojo** y dale a **Connect** (puerto `34872`). ¡Todo lo que modifiquemos se actualizará instantáneamente!
