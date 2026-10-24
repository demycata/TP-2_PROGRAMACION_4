import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function clavesCoincidenValidator(controlACoincidir: AbstractControl): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value !== controlACoincidir.value) {
      return { losControlesNoCoinciden: true };
    }
    return null;
  };
}
