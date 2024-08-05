import { Component, signal } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent {
  name = signal<string>('');

  constructor(private userService: UserService) {}

  setUpUser() {
    this.userService.registerUser(this.name()).subscribe();
  }
}
