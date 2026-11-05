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
import { imagenValidator } from '../../../shared/validators/imagen.validators';
import { ETIQUETAS } from '../../../shared/etiquetas';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-nueva-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  detallada = input(false, { transform: booleanAttribute });
  creada = output<Publicacion>();

  etiquetas = ETIQUETAS;

  enviado = signal(false);
  error = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);
  nombreImagen = signal<string | null>(null);
  mostrandoVistaPrevia = signal(false);

  private selector = viewChild.required<ElementRef<HTMLInputElement>>('selector');

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
