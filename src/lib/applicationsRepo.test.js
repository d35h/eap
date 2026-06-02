import { describe, it, expect, vi } from 'vitest';
import { createApplication, uploadWorkFiles } from './applicationsRepo.js';

function fakeClient(insertResult) {
  const single = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return { client: { from }, from, insert };
}

describe('createApplication', () => {
  it('inserts a pending application and returns the row', async () => {
    const row = { id: 'app-1', email: 'a@b.com', payment_status: 'pending' };
    const { client, from, insert } = fakeClient({ data: row, error: null });

    const result = await createApplication(client, {
      email: 'A@B.com',
      firstName: 'Ann',
      lastName: 'Lee',
      country: 'KZ',
      city: 'Almaty',
      website: '',
      instagram: '',
      works: [{ title: 'W1', year: '2024', media: '', size: '', desc: 'd' }],
      tier: 1,
    });

    expect(from).toHaveBeenCalledWith('applications');
    const payload = insert.mock.calls[0][0];
    expect(payload.email).toBe('a@b.com'); // lowercased
    expect(payload.payment_status).toBe('pending');
    expect(payload.tier).toBe(1);
    expect(payload.works).toHaveLength(1);
    expect(result).toEqual(row);
  });

  it('throws on supabase error', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(
      createApplication(client, { email: 'x@y.com', works: [], tier: 1 })
    ).rejects.toThrow('boom');
  });
});

function fakeStorageClient(uploadResult) {
  const upload = vi.fn().mockResolvedValue(uploadResult);
  const fromStorage = vi.fn(() => ({ upload }));
  return { client: { storage: { from: fromStorage } }, fromStorage, upload };
}

describe('uploadWorkFiles', () => {
  it('uploads each non-null file and returns its storage path', async () => {
    const { client, fromStorage, upload } = fakeStorageClient({ error: null });
    const files = [
      { name: 'a.jpg', type: 'image/jpeg' },
      null,
      { name: 'c.png', type: 'image/png' },
    ];

    const paths = await uploadWorkFiles(client, 'app-1', files);

    expect(fromStorage).toHaveBeenCalledWith('works');
    expect(upload).toHaveBeenCalledTimes(2);
    expect(paths).toEqual([
      'applications/app-1/work1.jpg',
      null,
      'applications/app-1/work3.png',
    ]);
  });

  it('throws if an upload errors', async () => {
    const { client } = fakeStorageClient({ error: { message: 'no space' } });
    await expect(
      uploadWorkFiles(client, 'app-1', [{ name: 'a.jpg' }])
    ).rejects.toThrow('no space');
  });
});
