
class EventEmitter
{
  constructor()
  {
    this.listeners = new Map();
    this.on = this.addListener;
    this.fire = this.emit;

  }

  addListener(label, fn)
  {
    this.listeners.has(label) || this.listeners.set(label, []);
    this.listeners.get(label).push(fn);
  }

  _isFunction(obj)
  {
    return typeof obj == 'function' || false;
  }

  clearListeners(label)
  {
    this.listeners.set(label, []);
  }

  removeListener(  )
  {
    throw "Unimplemented";
  }

  emit(label, ...args)
  {
    let listeners = this.listeners.get(label);
    if (listeners && listeners.length)
    {
      listeners.forEach((listener) => {
        listener(...args)
      });
      return true;
    }
    return false;
  }
}

module.exports = EventEmitter;
