import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.css'],
})
export class ImageUploadComponent {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewImage') previewImage!: ElementRef<HTMLImageElement>;

  capturedImage!: Blob;
  imagePreviewUrl: string | null = null;
  isLoading = false;
  result: any = null;
  startPoint = { x: 50, y: 50 };
  endPoint = { x: 150, y: 150 };
  draggingPoint: 'start' | 'end' | null = null;
  clickPoints: { x: number; y: number }[] = [];

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          this.video.nativeElement.srcObject = stream;
          this.video.nativeElement.play();
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
        });
    } else {
      console.error('getUserMedia not supported in this browser.');
      alert('Camera not supported in this browser.');
    }
    setTimeout(() => this.drawCanvas(), 300); // initialize default line after image loads
  }

  capture() {
    const canvas = document.createElement('canvas');
    canvas.width = this.video.nativeElement.videoWidth;
    canvas.height = this.video.nativeElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(this.video.nativeElement, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      this.capturedImage = blob;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        setTimeout(() => this.drawCanvas(), 100);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg');
  }

  onCanvasClick(event: MouseEvent) {
    const canvas = this.overlayCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.offsetX || event.clientX - rect.left;
    const y = event.offsetY || event.clientY - rect.top;
    this.clickPoints.push({ x, y });

    if (this.clickPoints.length === 2) {
      this.drawLine();
      this.uploadWithPoints();
    }
  }

  drawCanvas() {
    const imgEl = this.previewImage?.nativeElement;
    const canvasEl = this.overlayCanvas?.nativeElement;

    if (!imgEl || !canvasEl) return;

    canvasEl.width = imgEl.clientWidth;
    canvasEl.height = imgEl.clientHeight;

    this.drawLine(); // draw default line
  }

  drawLine() {
    const canvas = this.overlayCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Line
    ctx.beginPath();
    ctx.moveTo(this.startPoint.x, this.startPoint.y);
    ctx.lineTo(this.endPoint.x, this.endPoint.y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();

    // End point circles
    [this.startPoint, this.endPoint].forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'blue';
      ctx.fill();
      ctx.stroke();
    });
  }

  // Handle mouse events
  onMouseDown(event: MouseEvent) {
    const pos = this.getMousePosition(event);
    if (this.isNearPoint(pos, this.startPoint)) this.draggingPoint = 'start';
    else if (this.isNearPoint(pos, this.endPoint)) this.draggingPoint = 'end';
  }

  onMouseMove(event: MouseEvent) {
    if (!this.draggingPoint) return;

    const pos = this.getMousePosition(event);
    if (this.draggingPoint === 'start') this.startPoint = pos;
    else this.endPoint = pos;

    this.drawLine();
  }

  onMouseUp() {
    this.draggingPoint = null;
  }

  isNearPoint(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) < 10;
  }

  getMousePosition(event: MouseEvent) {
    const rect = this.overlayCanvas.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  uploadWithPoints() {
    if (!this.capturedImage) return;

    const formData = new FormData();
    formData.append('image', this.capturedImage);

    if (!this.startPoint || !this.endPoint) {
      alert('Please select two points on the image.');
      return;
    }

    let x1: number, y1: number, x2: number, y2: number;

    if (this.clickPoints.length === 2) {
      x1 = this.clickPoints[0].x;
      y1 = this.clickPoints[0].y;
      x2 = this.clickPoints[1].x;
      y2 = this.clickPoints[1].y;
    } else {
      x1 = this.startPoint.x;
      y1 = this.startPoint.y;
      x2 = this.endPoint.x;
      y2 = this.endPoint.y;
    }

    formData.append('x1', x1.toString());
    formData.append('y1', y1.toString());
    formData.append('x2', x2.toString());
    formData.append('y2', y2.toString());

    this.isLoading = true;
    this.http.post('http://localhost:8000/api/measure/', formData).subscribe({
      next: (res: any) => {
        this.result = res;
        this.isLoading = false;

        if (res.annotated_image) {
          this.imagePreviewUrl =
            'data:image/jpeg;base64,' + res.annotated_image;
          setTimeout(() => this.drawCanvas(), 200);
        }
      },
      error: (err) => {
        console.error('Measurement failed:', err);
        this.isLoading = false;
      },
    });
  }
}
