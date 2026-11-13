// Client helpers: admin session and picture uploads.

export async function signIn(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not sign in.');
  return data;
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function isSignedIn() {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    return !!(await res.json()).admin;
  } catch {
    return false;
  }
}

// Shrink a picture in the browser before sending it, so uploads stay small
// and quick on mobile data.
async function shrink(file, maxSide) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('Could not read that picture.');
  return blob;
}

async function upload(file, maxSide) {
  if (!file) return null;
  const blob = await shrink(file, maxSide);
  const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

export const uploadScreenshot = (file) => upload(file, 1600);
export const uploadTeamPicture = (file) => upload(file, 512);
