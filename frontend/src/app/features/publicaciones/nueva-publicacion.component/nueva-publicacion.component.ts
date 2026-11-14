import {
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SesionService } from '../../../core/auth/sesion.service';
import { PublicacionService } from '../../../services/publicacion.service';
import { Etiqueta, Publicacion } from '../../../models/publicacion.model';
import { FormatoMensaje } from '../../../models/mensaje.model';
import { imagenValidator } from '../../../shared/validators/imagen.validators';
import { ETIQUETAS } from '../../../shared/etiquetas';
import { mensajeDeError } from '../../../shared/mensaje-error';
import { MensajeComponent } from '../../../shared/mensaje.component/mensaje.component';

@Component({
  selector: 'app-nueva-publicacion',
  imports: [ReactiveFormsModule, MensajeComponent],
  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  detallada = input(false, { transform: booleanAttribute });//indica si se debe mostrar el formulario completo o solo el botón para abrirlo
  creada = output<Publicacion>();

  etiquetas = ETIQUETAS;

  enviado = signal(false);
  error = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);
  nombreImagen = signal<string | null>(null);
  mostrandoVistaPrevia = signal(false);

  private selector = viewChild.required<ElementRef<HTMLInputElement>>('selector');
  private cuerpo = viewChild<ElementRef<HTMLTextAreaElement>>('cuerpo');//referencia al input de tipo file para poder limpiar su valor cuando se quita la imagen

  form = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mensaje: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imagen: new FormControl<File | null>(null, { validators: [imagenValidator()] }),
    etiqueta: new FormControl<Etiqueta | null>(null),
  });

  titulo = toSignal(this.form.controls.titulo.valueChanges, { initialValue: '' });
  mensaje = toSignal(this.form.controls.mensaje.valueChanges, { initialValue: '' });
  etiqueta = toSignal(this.form.controls.etiqueta.valueChanges, { initialValue: null });
  lineas = computed(() => this.mensaje().split('\n'));

  constructor(
    protected sesionService: SesionService,
    private publicacionService: PublicacionService,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.liberarVistaPrevia());
  }

  alternarEtiqueta(valor: Etiqueta) {
    const control = this.form.controls.etiqueta;
    control.setValue(control.value === valor ? null : valor);
  }

  /*
   * Botones B / I / </> de la barra de la pantalla Nueva.
   * Si hay texto seleccionado, lo envuelve con las marcas; si no, inserta un
   * ejemplo donde está el cursor. En los dos casos, al terminar deja seleccionado
   * lo de adentro de las marcas, así el usuario escribe encima y lo reemplaza.
   *
   * Ejemplo con "Hola mundo" y "mundo" seleccionado (posiciones 5 a 10), botón B:
   *   antes:   Hola [mundo]          inicio = 5, fin = 10
   *   después: Hola **[mundo]**      selección de 7 a 12 (5 + 2 de "**", 7 + 5 de "mundo")
   */
  formatear(formato: FormatoMensaje) {
    /*
     * El <textarea #cuerpo> solo existe en la versión detallada (el compositor del
     * feed no tiene barra), por eso el viewChild es opcional y puede venir undefined.
     * nativeElement es el elemento real del DOM: hace falta para leer y mover la selección,
     * que el FormControl no conoce (solo sabe el valor).
     */
    const area = this.cuerpo()?.nativeElement;
    if (!area) {
      return;
    }

    /*
     * Desestructuración con renombre: selectionStart y selectionEnd son las posiciones
     * (índices dentro del texto) donde empieza y termina lo seleccionado. Si no hay nada
     * seleccionado, las dos son iguales: es la posición del cursor.
     */
    const { selectionStart: inicio, selectionEnd: fin, value: texto } = area;

    // ¿El cursor está al principio de una línea? (al principio de todo, o justo después de un salto)
    const enLineaNueva = inicio === 0 || texto[inicio - 1] === '\n';

    /*
     * Qué agregar en cada caso: [apertura, cierre, ejemplo si no hay selección].
     * Record<FormatoMensaje, …> obliga a que estén los 3 formatos: si mañana se
     * agrega uno al tipo y no acá, TypeScript no compila.
     *
     * El bloque de código es distinto porque las ``` tienen que ir en su propia línea
     * (es lo que busca la regex APERTURA de la pipe):
     *   - apertura: un \n antes si el cursor está a mitad de una línea, después ```ts y un salto.
     *   - cierre: salto, ``` y otro salto para que lo que siga quede afuera del bloque.
     *   Las ``` de la apertura van escapadas (\`) porque están adentro de un template string.
     */
    const marcas: Record<FormatoMensaje, [string, string, string]> = {
      negrita: ['**', '**', 'texto'],
      cursiva: ['_', '_', 'texto'],
      codigo: [`${enLineaNueva ? '' : '\n'}\`\`\`ts\n`, '\n```\n', '// tu código'],
    };
    const [apertura, cierre, ejemplo] = marcas[formato];

    // Lo seleccionado; si no había selección, slice da '' (falsy) y el || usa el ejemplo.
    const contenido = texto.slice(inicio, fin) || ejemplo;

    /*
     * Se arma el texto nuevo en 5 partes: lo de antes de la selección, la apertura,
     * el contenido, el cierre y lo de después. Se cambia por el FormControl y no
     * escribiendo area.value directamente: así se entera el formulario (validación,
     * el signal mensaje(), el contador y los números de línea del "espejo").
     * setValue actualiza el textarea en el momento, por eso la línea siguiente ya
     * puede mover la selección sobre el texto nuevo.
     */
    this.form.controls.mensaje.setValue(texto.slice(0, inicio) + apertura + contenido + cierre + texto.slice(fin));

    // Al tocar el botón, el foco se fue al botón: se devuelve al textarea para seguir escribiendo.
    area.focus();
    // Se selecciona solo el contenido (sin las marcas): empieza después de la apertura y dura lo que mide el contenido.
    area.setSelectionRange(inicio + apertura.length, inicio + apertura.length + contenido.length);
  }

  seleccionarImagen(evento: Event) {
    this.usarImagen((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  soltarImagen(evento: DragEvent) {
    evento.preventDefault();
    if (!this.enviado()) {
      this.usarImagen(evento.dataTransfer?.files[0] ?? null);
    }
  }

  quitarImagen() {
    this.selector().nativeElement.value = '';
    this.form.controls.imagen.setValue(null);
    this.liberarVistaPrevia();
    this.vistaPrevia.set(null);
    this.nombreImagen.set(null);
  }

  descartar() {
    this.form.reset();
    this.quitarImagen();
    this.mostrandoVistaPrevia.set(false);
    this.error.set(null);
  }

  publicar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviado()) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    const { titulo, mensaje, imagen, etiqueta } = this.form.getRawValue();
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('mensaje', mensaje);
    if (imagen) {
      formData.append('imagen', imagen);
    }
    if (etiqueta) {
      formData.append('etiqueta', etiqueta);
    }

    this.publicacionService.crear(formData).subscribe({
      next: (publicacion) => {
        this.descartar();
        this.enviado.set(false);
        this.creada.emit(publicacion);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
      },
    });
  }

  private usarImagen(archivo: File | null) {
    const control = this.form.controls.imagen;
    control.setValue(archivo);
    control.markAsTouched();

    this.liberarVistaPrevia();
    const valida = archivo && control.valid;
    this.vistaPrevia.set(valida ? URL.createObjectURL(archivo) : null);
    this.nombreImagen.set(valida ? archivo.name : null);
  }

  private liberarVistaPrevia() {
    const url = this.vistaPrevia();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
