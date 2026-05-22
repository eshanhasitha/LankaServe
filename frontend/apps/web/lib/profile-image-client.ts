import { API_BASE_URL } from './api.ts';

export async function uploadImageFile(
  file,
  accessToken,
  options: { label?: string; path?: string } = {}
) {
  const label = options.label || 'Image';
  const path = options.path || '/uploads/profile-image';

  if (!file) {
    throw new Error('No file selected');
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`${label} must be smaller than 5 MB`);
  }

  if (!accessToken) {
    throw new Error(`You must be logged in to upload ${label.toLowerCase()}`);
  }

  const formData = new FormData();
  formData.append('image', file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch (error) {
    throw new Error(`Cannot reach API server: ${error.message}`);
  }

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.data?.url) {
    throw new Error(
      payload?.message ||
      rawText?.trim() ||
      `${label} upload failed (${response.status} ${response.statusText})`
    );
  }

  return payload.data.url;
}

export async function uploadProfileImage(file, accessToken) {
  return uploadImageFile(file, accessToken, { label: 'Profile image' });
}

export async function uploadServiceImage(file, accessToken) {
  return uploadImageFile(file, accessToken, { label: 'Service image' });
}

export async function uploadSupportAttachmentImage(file, accessToken) {
  return uploadImageFile(file, accessToken, {
    label: 'Support attachment',
    path: '/uploads/support-attachment',
  });
}
