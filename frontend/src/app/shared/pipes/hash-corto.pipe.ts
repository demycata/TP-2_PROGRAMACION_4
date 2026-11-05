import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hashCorto' })
export class HashCortoPipe implements PipeTransform {
  transform(id: string): string {
    return id.slice(-7);
  }
}
