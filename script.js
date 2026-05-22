
console.log("SpareHub Marketplace Loaded");

const searchInput = document.querySelector(".search-box input");
const searchButton = document.querySelector(".search-box button");

searchButton.addEventListener("click", () => {
  if(searchInput.value.trim() !== ""){
    alert("Mencari spare part: " + searchInput.value);
  } else {
    alert("Masukkan nama spare part terlebih dahulu.");
  }
});
