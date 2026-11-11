const { withTimeout } = require('../../utils/withTimeout');

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves with the value when the promise settles in time', async () => {
    const result = withTimeout(Promise.resolve('ok'), 1000, 'req');
    await expect(result).resolves.toBe('ok');
  });

  it('propagates the original rejection', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 1000, 'req');
    await expect(result).rejects.toThrow('boom');
  });

  it('rejects when the promise never settles', async () => {
    const result = withTimeout(new Promise(() => {}), 1000, 'req');
    jest.advanceTimersByTime(1000);
    await expect(result).rejects.toThrow('req: sem resposta após 1000ms');
  });
});
