let index = 0;
const slides = document.querySelector(".slides");
const totalSlides = slides.children.length;

function showSlide(i) {
  index = (i + totalSlides) % totalSlides;
  slides.style.transform = 'translateX(-${index * 100}%)';
}

// Auto slide every 3 seconds
setInterval(() => {
  showSlide(index + 1);
}, 3000);

// Manual controls
document.querySelector(".prev").addEventListener("click", () => {
  showSlide(index - 1);
});
document.querySelector(".next").addEventListener("click", () => {
  showSlide(index + 1);
});