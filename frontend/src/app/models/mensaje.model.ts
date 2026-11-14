// Tipos de lo que devuelve FormatoMensajePipe. El mensaje se convierte en una lista de bloques,
// y cada bloque es un párrafo de texto o un bloque de código.

// Un pedazo de un párrafo con un solo estilo: "Hola **mundo**" son 2 partes (normal + negrita).
export type EstiloTexto = 'normal' | 'negrita' | 'cursiva' | 'codigo';

export interface ParteTexto {
  estilo: EstiloTexto;
  texto: string;
}

// Cada color es también el nombre de una clase de mensaje.component.css (.clave → var(--c-kw), etc.).
export type ColorCodigo = 'normal' | 'clave' | 'cadena' | 'numero' | 'comentario' | 'funcion';

export interface PiezaCodigo {
  color: ColorCodigo;
  texto: string;
}

export interface BloqueTexto {
  tipo: 'texto';
  partes: ParteTexto[];
}

export interface BloqueCodigo {
  tipo: 'codigo';
  lenguaje: string;
  // Matriz: lineas[n] es la línea n+1 del código, y adentro sus piezas en orden.
  lineas: PiezaCodigo[][];
}

/*
 * "Unión discriminada": los dos tipos tienen `tipo` con un valor fijo distinto.
 * Cuando el template pregunta @if (bloque.tipo === 'texto'), TypeScript ya sabe
 * que adentro `bloque` es un BloqueTexto (tiene `partes`), y en el @else que es
 * un BloqueCodigo (tiene `lineas`). Sin eso, el template no compilaría.
 */
export type BloqueMensaje = BloqueTexto | BloqueCodigo;

// Lo que define a un lenguaje para el resaltado: la regex con los 4 grupos y sus palabras clave.
export interface ReglasResaltado {
  token: RegExp;
  claves: Set<string>;
}

// Los botones de la barra de la pantalla Nueva (formatear() en NuevaPublicacionComponent).
export type FormatoMensaje = 'negrita' | 'cursiva' | 'codigo';
