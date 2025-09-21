import { store, updateStore } from "./store";

export function setupCounter(element: HTMLButtonElement) {
  const renderCounter = () => {
    element.innerHTML = `count is ${store.counter}`;
  };

  const setCounter = () => {
    updateStore({ counter: store.counter + 1 });
    renderCounter();
  };
  element.addEventListener("click", () => setCounter());
  renderCounter();
}
