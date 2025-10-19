/**
 * @hidden
 */
function getPropertyDescriptor(obj: any, name: string) {
  if (obj) {
    return (
      Object.getOwnPropertyDescriptor(obj, name) ||
      getPropertyDescriptor(Object.getPrototypeOf(obj), name)
    );
  }
}

/**
 * Create immutable proxies for all `properties` on `obj` proxying to `impl`.
 * @hidden
 */
export function createFrozenProxy<T>(obj: object, impl: T, properties: string[]): T {
  const missingDescriptors = properties.filter(
    (name) => getPropertyDescriptor(impl, name) === undefined,
  );

  if (missingDescriptors.length > 0) {
    throw new Error(
      `Implementation is not complete, missing properties: ${missingDescriptors.join(', ')}`,
    );
  }

  const target = properties.reduce((proxy, name) => {
    const desc = getPropertyDescriptor(impl, name);

    if ('value' in desc) {
      if (typeof desc.value === 'function') {
        proxy[name] = desc.value.bind(impl);
      } else {
        proxy[name] = desc.value;
      }
      return proxy;
    } else {
      return Object.defineProperty(proxy, name, {
        get: desc.get.bind(impl),
      });
    }
  }, obj);

  return new Proxy(target, {
    set(_target, _prop, _value) {
      throw new TypeError('Cannot add or modify properties on frozen object');
    },
    defineProperty(_target, _prop, _descriptor) {
      throw new TypeError('Cannot define property on frozen object');
    },
    deleteProperty(_target, _prop) {
      throw new TypeError('Cannot delete property on frozen object');
    },
    setPrototypeOf(_target, _proto) {
      throw new TypeError('Cannot set prototype on frozen object');
    },
  }) as T;
}
