/**
 * Helper to record 60fps high-definition WebM demo video directly from the 3D WebGL Canvas
 */
export class CanvasVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;

  public startRecording(canvas: HTMLCanvasElement): boolean {
    try {
      this.recordedChunks = [];
      const stream = canvas.captureStream(60); // 60 FPS capture

      // Supported MIME types fallback
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps crystal clear bitrate
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rocket-landing-ai-demo-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      this.mediaRecorder.start(100); // 100ms chunk timeslice
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start canvas recording:', err);
      return false;
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }
}

export const videoRecorder = new CanvasVideoRecorder();
