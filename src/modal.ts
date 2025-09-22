export function initModal() {
  const modal = document.getElementById("modal");
  if (modal) {
    const modalContent = document.createElement("div");
    modalContent.classList.add("modalContent");
    modal.appendChild(modalContent);
    modal.addEventListener("click", () => {
      showModal(false);
    });
  }
}

export function showModal(show: boolean, content: string = ""): void {
  const modal = document.getElementById("modal");
  if (modal) {
    modal.classList.toggle("show", show);
    const modalContent = document.getElementById("modalContent");
    if (modalContent) {
      modalContent.innerHTML = content;
    }
  }
}
