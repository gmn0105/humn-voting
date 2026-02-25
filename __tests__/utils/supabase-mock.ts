/**
 * Queue-based mock for getSupabase(). Each .single(), .maybeSingle(), or
 * awaited chain consumes the next response from the queue.
 */

export type SupabaseResponse<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

const emptyOk: SupabaseResponse = { data: null, error: null };

function makeThenable(next: () => Promise<SupabaseResponse>) {
  const p = next();
  return {
    then: (onFulfilled?: (r: SupabaseResponse) => unknown) =>
      p.then(onFulfilled as (r: SupabaseResponse) => PromiseLike<unknown>),
    catch: (onRejected?: (e: unknown) => unknown) => p.catch(onRejected),
  };
}

export function createMockSupabase() {
  const selectQueue: SupabaseResponse[] = [];
  const insertQueue: SupabaseResponse[] = [];
  const updateQueue: Array<{ error: { message: string } | null }> = [];
  const deleteQueue: Array<{ error: { message: string } | null }> = [];

  function nextSelect() {
    return Promise.resolve(selectQueue.length ? selectQueue.shift()! : emptyOk);
  }

  function nextInsert() {
    return Promise.resolve(insertQueue.length ? insertQueue.shift()! : emptyOk);
  }

  function nextUpdate() {
    return Promise.resolve(
      updateQueue.length ? updateQueue.shift()! : { error: null }
    );
  }

  function nextDelete() {
    return Promise.resolve(
      deleteQueue.length ? deleteQueue.shift()! : { error: null }
    );
  }

  const selectBuilder = () => ({
    eq: (_k1?: string, _v1?: unknown) => ({
      single: () => nextSelect(),
      maybeSingle: () => nextSelect(),
      order: () => makeThenable(nextSelect),
      eq: (_k2?: string, _v2?: unknown) => ({
        maybeSingle: () => nextSelect(),
        single: () => nextSelect(),
      }),
      then: (fn?: (r: SupabaseResponse) => unknown) =>
        nextSelect().then((r) => (fn ? fn(r) : r)),
    }),
    in: () => ({
      order: () => makeThenable(nextSelect),
      then: (fn?: (r: SupabaseResponse) => unknown) =>
        nextSelect().then((r) => (fn ? fn(r) : r)),
    }),
    order: () => makeThenable(nextSelect),
    then: (fn?: (r: SupabaseResponse) => unknown) =>
      nextSelect().then((r) => (fn ? fn(r) : r)),
    get count() {
      return {
        then: (fn: (r: { count: number }) => unknown) =>
          nextSelect().then((r) => {
            const n =
              typeof r.data === "number"
                ? r.data
                : Array.isArray(r.data)
                  ? r.data.length
                  : 0;
            return fn({ count: n });
          }),
      };
    },
  });

  const client = {
    from: (_table: string) => ({
      select: (_cols?: string | string[], _opts?: { count?: string; head?: boolean }) => {
        if (_opts?.head)
          return {
            eq: () =>
              nextSelect().then((r) => ({
                count:
                  typeof r.data === "number"
                    ? r.data
                    : Array.isArray(r.data)
                      ? r.data.length
                      : 0,
              })),
          };
        return selectBuilder();
      },
      insert: (_rows: unknown) => ({
        select: () => ({ single: () => nextInsert() }),
      }),
      update: (_row: unknown) => ({
        eq: () => nextUpdate(),
      }),
      delete: () => ({
        eq: () => nextDelete(),
      }),
    }),
  };

  return {
    client,
    pushSelect: (r: SupabaseResponse) => selectQueue.push(r),
    pushInsert: (r: SupabaseResponse) => insertQueue.push(r),
    pushUpdate: (r: { error: { message: string } | null }) => updateQueue.push(r),
    pushDelete: (r: { error: { message: string } | null }) => deleteQueue.push(r),
    clear: () => {
      selectQueue.length = 0;
      insertQueue.length = 0;
      updateQueue.length = 0;
      deleteQueue.length = 0;
    },
  };
}
