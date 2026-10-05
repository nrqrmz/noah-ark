# El arca de Noé — cuento interactivo en three.js

**Fecha:** 2026-10-05
**Estado:** borrador para revisión

## 1. Propósito

Un cuento ilustrado de la historia de Noé en el que cada página muestra, en lugar de una imagen, una escena animada en three.js con la que el niño puede interactuar.

- **Para quién:** familias cristianas en general (no denominacionales, Santos de los Últimos Días, Testigos de Jehová, etc.).
- **Cómo se usa:** un adulto (o hermano mayor) lee el texto en voz alta y el niño toca la escena. No es para darle el celular al niño y olvidarse de él.
- **Éxito:** la historia se cuenta completa y fiel a la Biblia, el niño participa en cada página y el adulto puede leerla cómodamente en un celular, tableta o computadora.

Fuera de alcance (por ahora): narración en audio, selector de edad, modo "juego" separado, más idiomas que español e inglés.

## 2. Reglas de contenido

1. **Fidelidad al canon bíblico.** Se usan solo pasajes de la Biblia (no Escrituras de los últimos días), para que sea universal. Los textos son paráfrasis fieles, no citas literales de una traducción.
2. **Referencias ocasionales.** Cada página puede mostrar una referencia en letra pequeña (p. ej. *Génesis 6:22*) donde aporte; no es obligatorio en todas.
3. **Ilustración vs. texto.** Las animaciones pueden ilustrar cosas que el texto no afirma (p. ej. los hijos cortando madera, ladrones con antifaz), pero el texto nunca afirma algo que la Biblia no dice.
4. **El niño actúa como Noé y su familia; lo que hace Dios ocurre solo, como animación.** El niño nunca provoca la luz de Dios, ni cierra la puerta, ni manda la lluvia, ni baja el agua, ni dibuja el arcoíris. Mientras corre una animación de Dios, los toques se ignoran.
5. **Dios nunca aparece con figura.** Se representa como luz que baja del cielo y como el texto.
6. **Nada aterrador.** La violencia es de caricatura (nubes de polvo, ladrones con antifaz). No se muestra a nadie ahogándose: durante el diluvio solo se ven el arca y el agua.
7. **Las mujeres nunca llevan velo.** Cabello suelto, de la altura de los hombros a media espalda.
8. **Animales carnívoros comen carne.** No se adopta la interpretación de que los animales eran herbívoros antes del diluvio.
9. **La promesa del arcoíris** se expresa como Génesis 9:11: nunca más habrá un diluvio para destruir la tierra.

## 3. Idiomas

- Español latinoamericano neutro ("tú", "ustedes"; sin "vos", sin "vosotros", sin regionalismos; ante la duda, forma de México) e inglés.
- Sin idioma por defecto: la portada muestra los botones de texto "Español" y "English" (sin emojis). Tras elegir aparece "Comenzar" / "Start".
- La elección se recuerda en el navegador (`localStorage`, envuelto en try/catch; si falla, simplemente no se recuerda).
- Un botón pequeño en una esquina permite cambiar de idioma a mitad del cuento; solo se repinta el panel de texto, la escena no se reinicia.
- Los textos viven en `lang/es.json` y `lang/en.json` con las mismas claves.

## 4. Escenas

Cada escena tiene una interacción y/o animación. **"Siguiente" aparece solo cuando terminan la interacción y la animación de cierre.**

| # | Escena | Referencias | Interacción del niño | Animación (sin toques) |
|---|---|---|---|---|
| 0 | Portada | — | Elegir idioma, tocar "Comenzar" | El arca flota suave y apaciblemente sobre el agua |
| 1 | El mundo lleno de violencia | Gén 6:5–13 | Tocar las casas de la ciudad: en cada una aparece algo (nube de pelea de caricatura, ladrón con antifaz entrando a robar). Noé está en su campo, a las afueras | Al descubrir todas, cae una luz cálida sobre Noé y Dios le habla ("Noé halló gracia", 6:8; la tierra llena de violencia, 6:13) |
| 2 | Noé predica y lo rechazan | 2 Pe 2:5; Mt 24:38; 1 Pe 3:20 | En la plaza, Noé habla con los brazos abiertos. Tocar a cada persona: una se ríe, otra se burla, otra se tapa los oídos, otra se da la vuelta y se va | Al final Noé queda solo en la plaza |
| 3 | Las instrucciones del arca | Gén 6:14–18 | Tocar puntos de luz; cada uno revela una parte del plano de luz: largo 300 codos (con un Noé pequeñito para escala), 3 pisos, ventana, puerta al costado, brea por dentro y por fuera | El arca completa se ilumina |
| 4 | Cortar madera y construir | Gén 6:10, 6:22; Heb 11:7 | Tocar árbol → un hijo lo corta y se vuelve troncos; tocar troncos → tablas; tocar tablas → vuelan al arca. Se repite con varios árboles | El arca crece por etapas hasta quedar terminada |
| 5 | Los animales en parejas | Gén 6:19–21; 7:8–9 | Tocar una comida y luego una pareja. Comida correcta → la pareja camina junta y sube por la rampa; incorrecta → el animal niega con la cabeza (sin castigo). Tres tandas de 4 parejas | Las parejas hacen fila en la rampa |
| 6 | Entran los 8 y llueve | Gén 7:7, 7:12, 7:16–20; 1 Pe 3:20 | Tocar a cada una de las 8 personas para que suba al arca | Dios cierra la puerta (con luz); llueve hasta que el agua cubre toda la tierra y el arca flota |
| 7 | El cuervo y la paloma | Gén 8:4–12 | El arca ya reposa sobre Ararat (cimas visibles). 4 toques en la ventana: el cuervo sale y va y viene; la paloma regresa sin nada; regresa con una hoja de olivo; no regresa | Cada vuelo |
| 8 | Salen y el arcoíris | Gén 8:13–19; 9:11–16 | Tocar a las parejas de animales y a la familia para que salgan del arca | El agua baja sola (el viento, 8:1) y se abre la puerta; al final el arcoíris aparece solo en el cielo con la promesa. Fin |

### Animales y comida (escena 5)

12 parejas, 24 animales, 7 comidas:

| Tanda | Pareja | Comida |
|---|---|---|
| 1 | León y leona | Carne |
| 1 | Vacas | Pasto |
| 1 | Jirafas | Hojas de árbol |
| 1 | Conejos | Zanahoria |
| 2 | Cocodrilos | Carne |
| 2 | Cabras | Pasto |
| 2 | Elefantes | Hojas de árbol |
| 2 | Perros | Hueso |
| 3 | Gatos | Pescado |
| 3 | Cebras | Pasto |
| 3 | Palomas | Semillas |
| 3 | Cuervos | Semillas |

En cada tanda solo aparecen las comidas de sus 4 parejas. Al subir las 4, llega la siguiente tanda.

## 5. Personajes y estilo

**Estilo general:** caricatura simple y amable, hecha con figuras primitivas (cápsulas, esferas, cajas, conos), como en `coin-collector`.

**Extremidades unidas.** En `coin-collector/player.js` los pivotes de los brazos quedan fuera del radio del torso y se ve un hueco. Aquí:
- cada articulación (hombro, cadera, patas) nace dentro del volumen del cuerpo;
- una esfera pequeña cubre cada unión para que no se vea hueco al animar;
- en las personas, la túnica cubre las caderas.

**Caras:** ojos de punto, sin nariz. Boca solo cuando hace falta (p. ej. quien se ríe de Noé).

**Ropa:** túnica de un color, más ancha abajo, cinturón de otro tono, sandalias simples, mangas unidas al cuerpo. Las mujeres llevan túnica más larga. Ninguna lleva velo.

| Personaje | Aspecto |
|---|---|
| Noé | El mayor (600 años, Gén 7:6). Barba larga blanca, cabello blanco. Túnica beige/café claro. Bastón opcional |
| Esposa de Noé | Cabello largo gris/blanco suelto. Túnica color vino |
| Sem, Cam, Jafet | Uno joven sin barba, uno con barba corta, uno con barba más grande. Cabello castaño oscuro, negro y rojizo. Túnicas azul, verde y terracota |
| Las tres nueras | Cabello largo suelto: negro, naranja y rubio. Cada una viste del color de su esposo |
| Habitantes | Túnicas en tonos apagados, variaciones de pelo |
| Ladrones | Habitantes con antifaz negro |

**Animales:** bonitos, de caricatura, sin dientes amenazantes. El cocodrilo parte del modelo de `coin-collector/crocodile.js`, suavizado. Machos y hembras: el león con melena y la leona sin melena; en los demás, la hembra un poco más pequeña y, en algunos casos, un detalle propio. Patas unidas al cuerpo con la misma regla que las personas.

**Solidez:** nadie atraviesa a nadie (ver §7).

## 6. Layout

La regla depende de la orientación de la pantalla, no del tipo de dispositivo. Mobile first.

- **Vertical** (celular, tableta vertical): animación arriba (≈60%), texto abajo (≈40%).
- **Horizontal** (tableta, laptop, escritorio, celular girado): texto a la izquierda (≈35%), animación a la derecha (≈65%).

Panel de texto: texto de la página en letra grande para leer en voz alta, referencia en letra pequeña, puntos de progreso y botón "Siguiente" abajo (al alcance del pulgar). Botón de idioma pequeño en una esquina de la animación. Se respetan las zonas seguras (`env(safe-area-inset-*)`). La meta es que cada texto quepa sin scroll; si no cabe, el panel hace scroll.

Girar la pantalla a mitad de una escena cambia el layout y reajusta la cámara sin reiniciar la escena.

## 7. Arquitectura

Vanilla three.js, sin build: three.js se carga desde un CDN con import map, módulos ES, sin `package.json`. Se sirve con cualquier servidor estático (`python3 -m http.server`) y se puede publicar en GitHub Pages.

```
noah-ark/
├── index.html            layout, CSS, import map
├── main.js               renderer, cámara, ciclo de animación, entrada de toques
├── story.js              orden de escenas, ciclo de vida, regla de "Siguiente"
├── i18n.js               carga del idioma, t(clave), recordar elección
├── lang/es.json, en.json
├── characters/
│   ├── rig.js            extremidades unidas (articulaciones dentro del cuerpo)
│   ├── people.js         Noé, familia, habitantes, ladrones
│   └── animals.js        12 animales, macho y hembra
├── world/
│   ├── terrain.js        suelo, montañas, agua que sube y baja
│   ├── sky.js            cielo, nubes, lluvia, arcoíris
│   ├── ark.js            plano de luz, construcción por etapas, arca terminada
│   └── props.js          árboles, troncos, tablas, casas, comida
├── systems/
│   ├── solid.js          separación de círculos (lógica pura)
│   └── tap.js            raycasting de toques, brillo de objetos tocables
├── scenes/0-cover.js … 8-rainbow.js
└── tests/                node --test
```

### Contrato de escena

Cada módulo de `scenes/` exporta una función que recibe un contexto (`{ THREE, scene, camera, t }`) y devuelve:

- `build()` — arma la escena y define la zona que la cámara debe encuadrar;
- `update(dt)` — anima cada cuadro;
- `onTap(objeto)` — responde a un toque sobre un objeto marcado como tocable;
- `isDone()` — verdadero cuando terminaron la interacción y la animación de cierre;
- `dispose()` — libera geometrías y materiales.

La lógica de estado de cada escena (qué se ha tocado, en qué paso va) se separa en funciones puras dentro del mismo módulo para poder probarla sin three.js.

### Flujo

1. `story.js` llama a `build()`, pinta texto y referencia de la escena, oculta "Siguiente".
2. Cada cuadro: `update(dt)`, luego `isDone()`. Si es verdadero, "Siguiente" aparece con brillo suave.
3. "Siguiente" → `dispose()` → siguiente escena.

### Sistemas

- **Toques (`tap.js`):** los objetos tocables se marcan y brillan suavemente; si el niño no toca nada en un rato, el brillo se intensifica. Durante animaciones de Dios se ignoran los toques.
- **Solidez (`solid.js`):** cada personaje y animal tiene un radio en el piso; cada cuadro se separan los que se enciman. Arca, casas y árboles son obstáculos fijos. En la rampa los animales hacen fila.
- **Comida:** tocar comida la selecciona; tocar otra cambia la selección; tocar un animal con la comida correcta lo sube; con la incorrecta niega con la cabeza y la selección se mantiene.
- **Cámara:** cada escena define una caja a encuadrar; la cámara se ajusta para que quepa completa en la proporción actual.
- **Pestaña en segundo plano:** el reloj se pausa para que las animaciones no "salten" al volver.
- **Texto faltante:** si falta una clave en un idioma se usa la del otro y se avisa en consola (las pruebas lo evitan).

## 8. Pruebas y verificación

**Automáticas (`node --test`, sin dependencias):**
- Solidez: dos cuerpos encimados terminan separados al menos la suma de sus radios; nadie entra en un obstáculo fijo.
- Comida: cada animal acepta su comida y rechaza las demás; cada tanda incluye las comidas de sus 4 parejas.
- Idiomas: `es.json` y `en.json` tienen las mismas claves y ningún texto vacío.
- Avance: "Siguiente" no aparece antes de `isDone()`; el orden de escenas es el correcto.
- Estado de escenas: árbol → troncos → tablas → arca; 4 vuelos en orden (cuervo, paloma ×3); las 8 personas suben y la escena termina; etc.

**Visuales (Claude, con el servidor MCP de Playwright):** cada escena en tamaño celular vertical, celular girado y escritorio. Se revisa: consola sin errores, extremidades unidas, nadie atraviesa a nadie, texto sin scroll, tocables brillan, "Siguiente" solo al final, ambos idiomas.

**Manuales (el usuario):** prueba en un celular real y juicio de gusto (que los personajes se vean bonitos, el ritmo, que el texto suene natural leído en voz alta).

## 9. Repositorio

- `git init`; un commit por paso del plan.
- `.gitignore` incluye `CLAUDE.md` y `.playwright-mcp/`.
- `CLAUDE.md` resume las reglas de este documento (§2, §3, §5, §6 y la elección técnica) para futuras sesiones.
- `.mcp.json` registra el servidor de Playwright del proyecto.
