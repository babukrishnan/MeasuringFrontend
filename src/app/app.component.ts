import { Component } from '@angular/core';
import { ImageUploadComponent } from "./components/image-upload/image-upload/image-upload.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ImageUploadComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
}
