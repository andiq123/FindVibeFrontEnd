import { Component, OnInit, signal } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { RemoteService } from '../../../services/remote.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  name = signal<string>('');
  loadingSubmiting = signal<boolean>(false);

  constructor(
    private userService: UserService,
    private remoteService: RemoteService
  ) {}

  ngOnInit(): void {
    this.remoteService.disconnectFromServer();
  }

  setUpUser() {
    this.loadingSubmiting.set(true);
    this.userService.registerUser(this.name()).subscribe({
      next: (user) => {
        this.loadingSubmiting.set(false);
        this.remoteService.connectToServer(user.name);
      },
    });
  }
}
