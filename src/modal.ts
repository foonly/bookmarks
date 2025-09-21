export function showModal(content: string): void {
  const modal = document.getElementById("modal");
  const modalContent = document.createElement("div");
  modalContent.classList.add("modalContent");
  modalContent.innerHTML = content;
  modal?.appendChild(modalContent);
  modal?.classList.add("show");
}
