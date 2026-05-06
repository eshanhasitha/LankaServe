import { API_BASE_URL } from './api.ts';

export async function uploadProfileImage(file, accessToken) {
  if (!file) {
    throw new Error('No file selected');
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5 MB');
  }

  if (!accessToken) {
    throw new Error('You must be logged in to upload a profile image');
  }

  const formData = new FormData();
  formData.append('image', file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads/profile-image`, {
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
      `Profile image upload failed (${response.status} ${response.statusText})`
    );
  }

  return payload.data.url;
}

