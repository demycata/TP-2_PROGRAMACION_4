import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SesionService } from '../../core/auth/sesion.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  constructor(protected sesionService: SesionService) {}
}
