export type CameraView = 'front' | 'side' | 'back';

let cameraRequestId = 0;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 4000) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('카메라 영상 준비 시간이 초과되었습니다.'));
    }, timeoutMs);

    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
  });
}

export async function openCamera(video: HTMLVideoElement): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 브라우저에서는 카메라를 사용할 수 없습니다. 이미지 업로드를 사용해주세요.');
  }

  const requestId = ++cameraRequestId;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1600 } },
    audio: false,
  });

  if (requestId !== cameraRequestId) {
    stopCamera(undefined, stream, false);
    return null;
  }

  const previousStream = video.srcObject instanceof MediaStream ? video.srcObject : null;
  if (previousStream && previousStream !== stream) {
    stopCamera(undefined, previousStream, false);
  }

  try {
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await waitForVideoReady(video);

    if (requestId !== cameraRequestId || video.srcObject !== stream) {
      stopCamera(undefined, stream, false);
      return null;
    }

    try {
      if (video.paused) await video.play();
    } catch (error) {
      if (!isAbortError(error)) throw error;
      // srcObject가 막 연결된 직후 브라우저가 play()를 중단한 경우 한 프레임 뒤 재시도합니다.
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      if (requestId !== cameraRequestId || video.srcObject !== stream) {
        stopCamera(undefined, stream, false);
        return null;
      }
      if (video.paused) await video.play();
    }

    return stream;
  } catch (error) {
    stopCamera(undefined, stream, false);
    throw error;
  }
}

export function stopCamera(video?: HTMLVideoElement | null, stream?: MediaStream | null, invalidateRequest = true) {
  if (invalidateRequest) cameraRequestId += 1;
  stream?.getTracks().forEach((track) => track.stop());

  if (video && stream && video.srcObject === stream) {
    video.pause();
    video.srcObject = null;
  } else if (video && !stream && video.srcObject instanceof MediaStream) {
    video.pause();
    video.srcObject = null;
  }
}

export async function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}
