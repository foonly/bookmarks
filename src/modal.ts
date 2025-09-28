const dialog: HTMLDialogElement | null =
  document.querySelector<HTMLDialogElement>("#modalDialog");

export function showModal(): void {
  if (dialog) {
    dialog.showModal();
  }
}

export function closeModal(): void {
  if (dialog) {
    dialog.close();
  }
}

export function setModalContent(content: HTMLElement): void {
  if (dialog) {
    dialog.append(content);
  }
}

export function clearModal(): void {
  if (dialog) {
    while (dialog.firstChild) {
      dialog.removeChild(dialog.firstChild);
    }
    dialog.close();
  }
}
