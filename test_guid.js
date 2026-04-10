const generateGuid = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      let r = 0;
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const array = new Uint8Array(1);
        crypto.getRandomValues(array);
        r = (array[0] ?? 0) % 16;
      } else {
        r = Math.random() * 16 | 0;
      }
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
console.log(generateGuid());
