import { Pipe, PipeTransform } from '@angular/core';
import {
  BloqueMensaje,
  ColorCodigo,
  ParteTexto,
  PiezaCodigo,
  ReglasResaltado,
} from '../../models/mensaje.model';

/*
 * ─── QUÉ HACE ESTA PIPE ────────────────────────────────────────────────────────
 * Recibe el mensaje tal como está guardado en la base (texto plano con marcas
 * tipo markdown) y devuelve DATOS, no HTML: una lista de bloques que después
 * MensajeComponent recorre con @for/@switch.
 *
 * Ejemplo. Entrada:
 *
 *   Uso **useEffect** y se ejecuta dos veces
 *   ```ts
 *   const n = 42;
 *   ```
 *
 * Salida:
 *
 *   [
 *     { tipo: 'texto', partes: [
 *         { estilo: 'normal',  texto: 'Uso ' },
 *         { estilo: 'negrita', texto: 'useEffect' },
 *         { estilo: 'normal',  texto: ' y se ejecuta dos veces' } ] },
 *     { tipo: 'codigo', lenguaje: 'ts', lineas: [            ← una fila por línea
 *         [ { color: 'clave', texto: 'const' }, { color: 'normal', texto: ' n = ' },
 *           { color: 'numero', texto: '42' }, { color: 'normal', texto: ';' } ] ] },
 *   ]
 *
 * ¿Por qué datos y no un string de HTML con [innerHTML]? Porque el texto lo
 * escribe el usuario: si armáramos HTML habría que escapar a mano cada < y >
 * (si no, un <script> en una publicación sería un XSS). Devolviendo datos,
 * el template muestra todo con {{ }}, que Angular ya escapa solo.
 *
 * El trabajo se hace en 3 niveles:
 *   1. transform()   → corta el mensaje en bloques de texto y bloques de código.
 *   2. partes()      → dentro de un bloque de texto, encuentra negrita, cursiva y `código`.
 *   3. resaltar()    → dentro de un bloque de código, colorea cada token y lo corta en líneas.
 *
 * Es una pipe "pura" (la opción por defecto): Angular solo la vuelve a ejecutar
 * cuando cambia el string de entrada, no en cada detección de cambios.
 * ───────────────────────────────────────────────────────────────────────────────
 */

/*
 * Línea que abre un bloque: ``` seguido opcionalmente del lenguaje.
 *   ^\s*        espacios al principio (por si el bloque está indentado)
 *   ```         las tres comillas invertidas
 *   \s*         espacios opcionales ("``` ts" también vale)
 *   ([\w+#.-]*) GRUPO 1 = el lenguaje: letras, números, _ y + # . - (c++, c#, objective-c…)
 *               Puede quedar vacío: ``` solo abre un bloque "sin lenguaje".
 */
const APERTURA = /^\s*```\s*([\w+#.-]*)/;

// Línea que cierra un bloque: solo ``` (con espacios opcionales antes y después), nada más.
const CIERRE = /^\s*```\s*$/;

/*
 * Formato dentro del texto. Son 3 alternativas separadas por |, y cada una
 * captura su contenido en un grupo distinto; así después sabemos cuál matcheó
 * mirando qué grupo vino con valor (los otros vienen undefined).
 *
 *   `([^`\n]+)`      GRUPO 1 = código en línea: lo que hay entre dos `, sin saltos de línea.
 *   \*\*([^*\n]+)\*\* GRUPO 2 = negrita: lo que hay entre ** y **. El * se escapa con \
 *                    porque en una regex significa "repetir".
 *   _([^_\n]+)_      GRUPO 3 = cursiva: lo que hay entre _ y _ …
 *     (?<![\p{L}\p{N}_])  … con un "lookbehind negativo": el _ que abre NO puede tener
 *                         pegada antes una letra (\p{L}, incluye á, ñ…), un número (\p{N}) ni otro _.
 *     (?![\p{L}\p{N}_])   … y un "lookahead negativo": el _ que cierra tampoco puede tener una pegada después.
 *     Así "mi_variable_rara" no se convierte en "mi" + cursiva("variable") + "rara".
 *
 * Banderas: g = buscar todas las coincidencias (lo necesita matchAll),
 *           u = modo Unicode (lo necesitan \p{L} y \p{N}).
 *
 * El código en línea va primero en la alternativa a propósito: la regex avanza de
 * izquierda a derecha y se "come" todo el `…` de una vez, así un ** adentro de
 * backticks (`a ** b`) no se interpreta como negrita.
 */
const FORMATO_EN_LINEA = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|(?<![\p{L}\p{N}_])_([^_\n]+)_(?![\p{L}\p{N}_])/gu;

/*
 * ─── RESALTADO DE SINTAXIS ─────────────────────────────────────────────────────
 * Cada lenguaje tiene una regex "token" con 4 alternativas, SIEMPRE en el mismo
 * orden de grupos, así resaltar() funciona igual para todos:
 *   GRUPO 1 = comentario   GRUPO 2 = cadena (string)   GRUPO 3 = número   GRUPO 4 = palabra
 * Lo que no matchea ninguna alternativa (espacios, ( ) { } ; = + …) queda en el
 * medio, entre coincidencias, y se pinta con el color normal.
 *
 * El orden de las alternativas importa: si "palabra" estuviera antes que
 * "comentario", en "// const" la regex se quedaría con "const" como palabra
 * clave en vez de tomar todo como comentario.
 * ───────────────────────────────────────────────────────────────────────────────
 */
const JAVASCRIPT: ReglasResaltado = {
  /*
   * GRUPO 1, comentario:
   *   \/\/[^\n]*               // hasta el final de la línea
   *   \/\*[\s\S]*?(?:\*\/|$)   comentario de bloque (barra-asterisco … asterisco-barra; no se puede
   *                            escribir literal acá porque cerraría este mismo comentario).
   *                            [\s\S] es "cualquier carácter, incluido el salto de línea" (el . solo
   *                            no incluye \n). *? es "lo menos posible", para cortar en el primer
   *                            cierre y no en el último. |$ = si nunca se cierra, hasta el final.
   * GRUPO 2, cadena:
   *   '(?:\\.|[^'\\\n])*'?     '…': adentro, o un escape (\' \n …) o cualquier cosa que no sea ' \ o salto.
   *                            El '? final es opcional: si el usuario no la cerró, igual se pinta.
   *   "(?:\\.|[^"\\\n])*"?     lo mismo con comillas dobles.
   *   `(?:\\[\s\S]|[^`\\])*`?  template string: este SÍ puede tener saltos de línea adentro.
   * GRUPO 3, número:
   *   \b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b
   *                            hexadecimal (0xFF) o decimal con _ separador (1_000), decimales (3.14)
   *                            y exponente (1e-5). \b = borde de palabra, para no tomar el 1 de "a1".
   * GRUPO 4, palabra:
   *   [A-Za-z_$][\w$]*         un identificador: empieza con letra, _ o $, y sigue con letras/números/_/$.
   *                            Después se decide si es palabra clave, función o una palabra común.
   */
  token:
    /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?|`(?:\\[\s\S]|[^`\\])*`?)|(\b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b)|([A-Za-z_$][\w$]*)/g,
  // Set y no array: .has() busca directo, sin recorrer la lista entera en cada palabra.
  claves: new Set([
    'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if',
    'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'of', 'private',
    'protected', 'public', 'readonly', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true',
    'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'yield',
  ]),
};

const PYTHON: ReglasResaltado = {
  /*
   * Mismos 4 grupos, con las reglas de Python:
   * GRUPO 1, comentario:  #[^\n]*  (Python no tiene comentarios de bloque)
   * GRUPO 2, cadena:
   *   (?:\b[rRbBfFuU]{1,2})?   prefijo opcional: f"…" (f-string), r'…' (raw), b"…" (bytes), rb, fr…
   *   """[\s\S]*?(?:"""|$)     cadena triple, puede ocupar varias líneas (los docstrings).
   *   '''[\s\S]*?(?:'''|$)     lo mismo con comillas simples.
   *   '…' y "…"                iguales que en JavaScript.
   *   Las triples van ANTES que las simples: si no, """ se leería como "" (cadena vacía) + ".
   * GRUPO 3, número: como en JS, más la j opcional de los números complejos (3j).
   * GRUPO 4, palabra: [A-Za-z_]\w*  (en Python el $ no forma parte de los nombres).
   */
  token:
    /(#[^\n]*)|((?:\b[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|'(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?))|(\b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?j?)\b)|([A-Za-z_]\w*)/g,
  claves: new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'self', 'try', 'while', 'with',
    'yield',
  ]),
};

/*
 * Qué reglas usar según lo que se escribió después de ```. Varios nombres apuntan
 * al mismo objeto (TypeScript se pinta igual que JavaScript). Un lenguaje que no
 * está acá (```java, ``` solo) se muestra sin colores.
 *
 * Map y no un objeto { js: JAVASCRIPT, … }: con un objeto, un bloque marcado
 * ```constructor o ```tostring encontraría propiedades heredadas de Object
 * (RESALTADO['constructor'] existe en cualquier objeto) y la pipe se rompería.
 * Un Map solo tiene lo que se le cargó.
 */
const RESALTADO = new Map<string, ReglasResaltado>([
  ['js', JAVASCRIPT],
  ['javascript', JAVASCRIPT],
  ['jsx', JAVASCRIPT],
  ['ts', JAVASCRIPT],
  ['typescript', JAVASCRIPT],
  ['tsx', JAVASCRIPT],
  ['py', PYTHON],
  ['python', PYTHON],
]);

/*
 * ¿Lo que sigue es un "("? (con espacios opcionales). Sirve para saber si una
 * palabra es una llamada a función: en "console.log(" la palabra "log" va de amarillo.
 * La bandera y ("sticky") hace que la regex pruebe EXACTAMENTE en la posición
 * lastIndex y no busque más adelante: "¿justo acá hay un paréntesis?".
 */
const LLAMADA = /\s*\(/y;

@Pipe({ name: 'formatoMensaje' })
export class FormatoMensajePipe implements PipeTransform {
  /*
   * NIVEL 1: separar texto y código.
   * Se recorre el mensaje línea por línea. Las líneas comunes se van juntando en
   * `texto`; cuando aparece una línea de apertura (```), lo juntado hasta ahí se
   * guarda como un bloque de texto y se empiezan a juntar las líneas de código
   * hasta encontrar el cierre.
   */
  transform(mensaje: string): BloqueMensaje[] {
    const bloques: BloqueMensaje[] = [];
    // \r\n → \n: un texto pegado desde Windows trae \r\n y el \r quedaría pegado al final de cada línea.
    const lineas = mensaje.replace(/\r\n/g, '\n').split('\n');
    let texto: string[] = [];

    for (let i = 0; i < lineas.length; i++) {
      const apertura = lineas[i].match(APERTURA);
      if (!apertura) {
        texto.push(lineas[i]);
        continue;
      }

      // Llegó un ```: se cierra el bloque de texto que se venía armando.
      this.agregarTexto(bloques, texto);
      texto = [];

      /*
       * ++i avanza ANTES de comparar: salteamos la línea del ``` de apertura y
       * juntamos hasta el ``` de cierre. Como este while mueve el mismo `i` del
       * for, al terminar el for sigue después del cierre. Si el bloque nunca se
       * cierra, se toma todo hasta el final del mensaje (i llega a lineas.length).
       */
      const codigo: string[] = [];
      while (++i < lineas.length && !CIERRE.test(lineas[i])) {
        codigo.push(lineas[i]);
      }
      // Se sacan las líneas vacías del final, si no se verían números de línea sin código.
      while (codigo.length > 1 && !codigo[codigo.length - 1].trim()) {
        codigo.pop();
      }
      // apertura[1] es el GRUPO 1 de APERTURA: el lenguaje ("ts", "Python"…), en minúsculas para buscarlo en el Map.
      const lenguaje = apertura[1].toLowerCase();
      bloques.push({ tipo: 'codigo', lenguaje, lineas: this.resaltar(codigo.join('\n'), lenguaje) });
    }

    // Lo que quedó juntado después del último bloque de código (o todo el mensaje, si no había código).
    this.agregarTexto(bloques, texto);
    return bloques;
  }

  private agregarTexto(bloques: BloqueMensaje[], lineas: string[]) {
    /*
     * Se sacan las líneas en blanco del principio y del final: son las que quedan
     * pegadas a los ``` y agregarían espacio de más entre bloques. Las del medio se
     * respetan (el párrafo usa white-space: pre-line, así se ven los saltos).
     *   ^\s*\n   espacios y saltos al principio, hasta el último \n de ese tramo.
     *   \n\s*$   desde un \n hasta el final, si lo que sigue es solo espacio.
     */
    const texto = lineas.join('\n').replace(/^\s*\n|\n\s*$/g, '');
    // Un tramo vacío (por ejemplo, entre dos bloques de código seguidos) no genera un párrafo.
    if (texto.trim()) {
      bloques.push({ tipo: 'texto', partes: this.partes(texto) });
    }
  }

  /*
   * NIVEL 2: formato dentro de un bloque de texto.
   * Patrón "recorrer coincidencias y rellenar los huecos", el mismo que usa resaltar():
   *   - `ultimo` marca hasta dónde ya procesamos.
   *   - Por cada coincidencia, el tramo entre `ultimo` y el inicio de la
   *     coincidencia es texto normal; después va la parte con formato.
   *   - Al final, lo que sobra después de la última coincidencia también es normal.
   *
   * "Hola **mundo** chau"  →  normal "Hola " | negrita "mundo" | normal " chau"
   *        ^ultimo=0  ^index=5        ^ultimo=14
   */
  private partes(texto: string): ParteTexto[] {
    const partes: ParteTexto[] = [];
    let ultimo = 0;

    // matchAll devuelve todas las coincidencias, cada una con sus grupos y su posición (index).
    for (const coincidencia of texto.matchAll(FORMATO_EN_LINEA)) {
      /*
       * Desestructuración del resultado: [0] es todo lo que matcheó (con las marcas,
       * "**mundo**"), [1] [2] [3] son los grupos de FORMATO_EN_LINEA (solo el texto,
       * "mundo"). Solo uno de los tres grupos viene con valor: es el que matcheó.
       */
      const [completo, codigo, negrita, cursiva] = coincidencia;
      if (coincidencia.index > ultimo) {
        partes.push({ estilo: 'normal', texto: texto.slice(ultimo, coincidencia.index) });
      }
      // Se compara con undefined y no con un if (codigo) a secas, por claridad: el grupo que no matcheó viene undefined.
      if (codigo !== undefined) {
        partes.push({ estilo: 'codigo', texto: codigo });
      } else if (negrita !== undefined) {
        partes.push({ estilo: 'negrita', texto: negrita });
      } else {
        partes.push({ estilo: 'cursiva', texto: cursiva });
      }
      ultimo = coincidencia.index + completo.length;
    }

    if (ultimo < texto.length) {
      partes.push({ estilo: 'normal', texto: texto.slice(ultimo) });
    }
    return partes;
  }

  /*
   * NIVEL 3: colores de un bloque de código.
   * Devuelve una matriz: un array por línea, y en cada línea las piezas con su color.
   * El template usa la cantidad de filas para los números de línea.
   */
  private resaltar(codigo: string, lenguaje: string): PiezaCodigo[][] {
    const reglas = RESALTADO.get(lenguaje);
    // Lenguaje desconocido: cada línea es una sola pieza sin color.
    if (!reglas) {
      return codigo.split('\n').map((linea): PiezaCodigo[] => [{ color: 'normal', texto: linea }]);
    }

    /*
     * Paso A: tokenizar el código ENTERO (no línea por línea).
     * Así un comentario de bloque o un """docstring""" de varias líneas se reconoce
     * de una vez. Si se recorriera línea por línea, la segunda línea del comentario
     * no sabría que está adentro de un comentario.
     */
    const piezas: PiezaCodigo[] = [];
    let ultimo = 0;

    for (const coincidencia of codigo.matchAll(reglas.token)) {
      // Los 4 grupos que tienen todas las reglas (ver arriba). El 4º, la palabra, es `completo`.
      const [completo, comentario, cadena, numero] = coincidencia;
      // El hueco entre la coincidencia anterior y esta: símbolos, espacios… → color normal.
      if (coincidencia.index > ultimo) {
        piezas.push({ color: 'normal', texto: codigo.slice(ultimo, coincidencia.index) });
      }
      ultimo = coincidencia.index + completo.length;

      let color: ColorCodigo = 'normal';
      if (comentario !== undefined) {
        color = 'comentario';
      } else if (cadena !== undefined) {
        color = 'cadena';
      } else if (numero !== undefined) {
        color = 'numero';
      } else if (reglas.claves.has(completo)) {
        // Es una palabra: primero se fija si es palabra clave (const, def, return…).
        color = 'clave';
      } else {
        // Si no, es función si justo después viene un "(". `ultimo` ya apunta al final de la palabra.
        LLAMADA.lastIndex = ultimo;
        if (LLAMADA.test(codigo)) {
          color = 'funcion';
        }
        // Si tampoco, queda 'normal' (una variable común).
      }
      piezas.push({ color, texto: completo });
    }

    if (ultimo < codigo.length) {
      piezas.push({ color: 'normal', texto: codigo.slice(ultimo) });
    }

    /*
     * Paso B: cortar en líneas, para poder numerarlas.
     * Una pieza puede tener saltos adentro (el comentario de varias líneas):
     * se parte por cada \n y cada parte después de un salto arranca una línea nueva,
     * conservando el color de la pieza original.
     *
     *   piezas: [clave "def"] [normal " f():\n    "] [cadena '"""uno\n    dos"""']
     *   líneas: [clave "def", normal " f():"]
     *           [normal "    ", cadena '"""uno']
     *           [cadena '    dos"""']
     */
    const lineas: PiezaCodigo[][] = [[]];
    for (const pieza of piezas) {
      pieza.texto.split('\n').forEach((parte, indice) => {
        if (indice > 0) {
          lineas.push([]);
        }
        // Una parte vacía (por ejemplo, justo después de un \n) no agrega una pieza, pero la línea igual existe.
        if (parte) {
          lineas[lineas.length - 1].push({ color: pieza.color, texto: parte });
        }
      });
    }
    return lineas;
  }
}
