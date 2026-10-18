var REVIEW_STORAGE_KEY = "travel-brochure-reviews";
var CONTACT_NOTE_STORAGE_KEY = "travel-brochure-contact-notes";
var DESTINATIONS = {
  banaue: { name: "Banaue Rice Terraces (Ifugao)", baseRating: 5 },
  intramuros: { name: "Intramuros (Manila)", baseRating: 4.5 },
  boracay: { name: "Boracay Island (Aklan)", baseRating: 5 },
  bohol: { name: "Bohol", baseRating: 5 },
  siargao: { name: "Siargao Island (Surigao del Norte)", baseRating: 5 },
  samal: { name: "Samal (Davao City)", baseRating: 4.5 }
};

function readReviewStore() {
  var storedReviews = window.localStorage.getItem(REVIEW_STORAGE_KEY);
  if (!storedReviews) {
    return {};
  }

  var reviews = JSON.parse(storedReviews);
  if (!reviews || typeof reviews !== "object" || Array.isArray(reviews)) {
    throw new Error("Saved reviews have an invalid format.");
  }
  return reviews;
}

function getDestinationReviews(reviewStore, destinationId) {
  var reviews = reviewStore[destinationId] || [];
  if (!Array.isArray(reviews)) {
    throw new Error("Saved reviews for this destination have an invalid format.");
  }
  for (var i = 0; i < reviews.length; i++) {
    var review = reviews[i];
    if (!review || typeof review.name !== "string" ||
        typeof review.review !== "string" ||
        !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
      throw new Error("A saved review has invalid details.");
    }
  }
  return reviews;
}

function loadContactNotes() {
  var storedNotes = window.localStorage.getItem(CONTACT_NOTE_STORAGE_KEY);
  if (!storedNotes) {
    return [];
  }

  var notes = JSON.parse(storedNotes);
  if (!Array.isArray(notes)) {
    throw new Error("Saved notes have an invalid format.");
  }
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    if (!note || typeof note.name !== "string" ||
        typeof note.topic !== "string" ||
        typeof note.message !== "string") {
      throw new Error("A saved note has invalid details.");
    }
  }
  return notes;
}

function renderContactNotes() {
  var noteList = document.getElementById("submitted-note-list");
  if (!noteList) {
    return;
  }

  noteList.textContent = "";
  var notes;
  try {
    notes = loadContactNotes();
  } catch (error) {
    var errorMessage = document.createElement("p");
    errorMessage.className = "notes-empty review-error";
    errorMessage.textContent = "Saved notes could not be loaded. " + error.message;
    noteList.appendChild(errorMessage);
    console.error("Unable to load contact notes:", error);
    return;
  }

  if (!notes.length) {
    var emptyMessage = document.createElement("p");
    emptyMessage.className = "notes-empty";
    emptyMessage.textContent = "No notes yet. Be the first to share a travel idea!";
    noteList.appendChild(emptyMessage);
    return;
  }

  notes.slice().reverse().forEach(function (note) {
    var card = document.createElement("article");
    card.className = "submitted-note-card";

    var heading = document.createElement("div");
    heading.className = "submitted-note-heading";
    var name = document.createElement("h3");
    name.textContent = note.name;
    var topic = document.createElement("span");
    topic.className = "tag";
    topic.textContent = note.topic;
    heading.appendChild(name);
    heading.appendChild(topic);

    var message = document.createElement("p");
    message.textContent = note.message;
    card.appendChild(heading);
    card.appendChild(message);

    if (note.createdAt) {
      var date = document.createElement("time");
      date.className = "submitted-note-date";
      date.dateTime = note.createdAt;
      date.textContent = new Date(note.createdAt).toLocaleDateString();
      card.appendChild(date);
    }
    noteList.appendChild(card);
  });
}

function submitContactNote(event) {
  event.preventDefault();
  var form = event.currentTarget;
  var status = document.getElementById("form-message");
  var name = document.getElementById("visitor-name").value.trim();
  var email = document.getElementById("visitor-email").value.trim();
  var topicSelect = document.getElementById("topic");
  var message = document.getElementById("visitor-message").value.trim();

  if (!name || !email || !message) {
    status.textContent = "Please complete all fields before sending your note.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }

  var notes;
  try {
    notes = loadContactNotes();
    notes.push({
      name: name,
      topic: topicSelect.options[topicSelect.selectedIndex].text,
      message: message,
      createdAt: new Date().toISOString()
    });
    window.localStorage.setItem(CONTACT_NOTE_STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    status.textContent = "Your note could not be saved. " + error.message;
    status.className = "form-message review-error";
    status.style.display = "block";
    console.error("Unable to save contact note:", error);
    return;
  }

  renderContactNotes();
  form.reset();
  status.textContent = "Your note has been added below. It is saved in this browser only.";
  status.className = "form-message review-success";
  status.style.display = "block";
  document.getElementById("submitted-note-list").scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatRating(rating) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1);
}

function starText(rating) {
  var fullStars = Math.floor(rating);
  return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
}

function ratingMarkup(destinationId) {
  var destination = DESTINATIONS[destinationId];
  var stars = starText(destination.baseRating);
  return `<p><a class="destination-rating" href="reviews.html?destination=${destinationId}" data-destination-rating="${destinationId}" aria-label="Read and write reviews for ${destination.name}">Ratings: ${stars} (${formatRating(destination.baseRating)}/5)</a></p>`;
}

function updateRegionRatings() {
  var ratings = document.querySelectorAll("[data-destination-rating]");
  var reviewStore;
  try {
    reviewStore = readReviewStore();
  } catch (error) {
    console.error("Unable to load saved reviews:", error);
    var regionDisplay = document.getElementById("region-display");
    if (regionDisplay) {
      var errorMessage = document.createElement("p");
      errorMessage.className = "form-message review-error";
      errorMessage.textContent = "Saved reviews could not be loaded. " + error.message;
      errorMessage.style.display = "block";
      regionDisplay.insertBefore(errorMessage, regionDisplay.firstChild);
    }
    return;
  }

  for (var i = 0; i < ratings.length; i++) {
    var destinationId = ratings[i].getAttribute("data-destination-rating");
    var destinationReviews;
    try {
      destinationReviews = getDestinationReviews(reviewStore, destinationId);
    } catch (error) {
      console.error("Unable to load saved reviews:", error);
      continue;
    }

    if (destinationReviews.length) {
      var average = destinationReviews.reduce(function (total, review) {
        return total + Number(review.rating);
      }, 0) / destinationReviews.length;
      ratings[i].textContent = "Ratings: " +
        starText(average) +
        " (" + formatRating(average) + "/5)";
    }
  }
}

/* --- MOBILE MENU FUNCTION --- */
function showMobileMenu() {
  var menu = document.getElementById("main-nav");
  var button = document.getElementById("menu-button");

  if (menu.className.indexOf("open") === -1) {
    menu.className = "main-nav open";
    button.innerHTML = "Close menu";
  } else {
    menu.className = "main-nav";
    button.innerHTML = "Menu";
  }
}

/* --- REGION CONTENT FUNCTION (Luzon, Visayas, Mindanao) --- */
function showRegion(region) {
  var displayDiv = document.getElementById("region-display");
  
  if (region === 'luzon') {
    displayDiv.innerHTML = `
      <div class="region-card-grid">
        <div class="feature-card region-feature-card">
          <img src="Banaue.png" alt="Banaue">
          <div class="feature-card-content">
            <h3>1. Banaue Rice Terraces (Ifugao)</h3>
            <p><strong>Description:</strong> Amazing mountain terraces carved by ancestors with great care.</p>
            <p><strong>Famous Foods:</strong> Tinawon Red Ric</p>
            ${ratingMarkup("banaue")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/7LqAJoD-PpA" title="Soar Over the Lush Rice Terraces of the Philippines | National Geographic" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Manila.png" alt="Manila">
          <div class="feature-card-content">
            <h3>2. Intramuros (Manila)</h3>
            <p><strong>Description:</strong> The historic Walled City of Manila. Walk through cabblestone streets, ride a bamboo bike or kalesa, and visit Fort Santigao where Dr. Jose Rizal was imprisoned. It's the hold soul of Manila.</p>
            <p><strong>Famous Foods:</strong> Halo Halo</p>
            ${ratingMarkup("intramuros")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/Db19KNNSWa0" title="Virtual Tour | It&#39;s More Fun with You in Manila (Intramuros)" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
      </div>
    `;
  } else if (region === 'visayas') {
    displayDiv.innerHTML = `
      <div class="region-card-grid">
        <div class="feature-card region-feature-card">
          <img src="Boracay.png" alt="Boracay">
          <div class="feature-card-content">
            <h3>1. Boracay Island (Aklan)</h3>
            <p><strong>Description:</strong> World-famous for its bright white powdery sand beach and clear waters.</p>
            <p><strong>Famous Foods:</strong> Chori Burger, Fresh Seafood</p>
            ${ratingMarkup("boracay")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/oVdGmgfeTeI" title="Aklan, Philippines" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Bohol.png" alt="Bohol">
          <div class="feature-card-content">
            <h3>2.Bohol</h3>
            <p><strong>Description:</strong> A rich blend of history, heritage spots, waterfalls, and island beaches.</p>
            <p><strong>Famous Foods:</strong> Peanut Kisses</p>
            ${ratingMarkup("bohol")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/XH5zW6PRXdc" title="Explore BOHOL PHILIPPINES | CHOCOLATE HILLS &amp; BOHOL TARSIERS - Bohol’s Top Tourist Attractions!" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>          </div>
        </div>
      </div>
    `;
  } else if (region === 'mindanao') {
    displayDiv.innerHTML = `
      <div class="region-card-grid">
        <div class="feature-card region-feature-card">
          <img src="Siargao.png" alt="Siargao">
          <div class="feature-card-content">
            <h3>1. Siargao Island (Surigao del Norte)</h3>
            <p><strong>Description:</strong> The Surfing Capital of the Philippines with stunning blue horizons.</p>
            <p><strong>Famous Foods:</strong> Kinilaw</p>
            ${ratingMarkup("siargao")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/YuSAnPSOsZU" title="Top 7 Best Places in SURIGAO del Sur (2023) | The Lost Feet PH" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Davao.png" alt="Davao">
          <div class="feature-card-content">
            <h3>2. Samal (Davao City)</h3>
            <p><strong>Description:</strong> A volcanic island known for sweet lanzones fruits and springs.</p>
            <p><strong>Famous Foods:</strong> Durian</p>
            ${ratingMarkup("samal")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/1TtZrCjjbl8" title="SAMAL ISLAND 🇵🇭 Ultimate Travel Guide + Expenses + Island Tour" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>          </div>
        </div>
      </div>
    `;
  }

  updateRegionRatings();
  applyRevealEffects();
}

function renderDestinationReviews(destinationId) {
  var destination = DESTINATIONS[destinationId];
  var title = document.getElementById("review-destination-title");
  var summary = document.getElementById("review-rating-summary");
  var list = document.getElementById("destination-review-list");
  var form = document.getElementById("destination-review-form");
  var status = document.getElementById("review-status");

  if (!destination) {
    title.textContent = "Destination not found";
    summary.textContent = "Please return to the home page and choose a destination.";
    form.hidden = true;
    return;
  }

  title.textContent = destination.name;

  var reviewStore;
  try {
    reviewStore = readReviewStore();
  } catch (error) {
    status.textContent = "Saved reviews could not be loaded. " + error.message;
    status.className = "form-message review-error";
    status.style.display = "block";
    list.textContent = "Reviews are unavailable until the saved review data can be read.";
    form.hidden = true;
    console.error("Unable to load saved reviews:", error);
    return;
  }

  var reviews;
  try {
    reviews = getDestinationReviews(reviewStore, destinationId);
  } catch (error) {
    status.textContent = "Saved reviews could not be loaded. " + error.message;
    status.className = "form-message review-error";
    status.style.display = "block";
    list.textContent = "Reviews are unavailable until the saved review data can be read.";
    form.hidden = true;
    console.error("Unable to load saved reviews:", error);
    return;
  }

  var average = reviews.length
    ? reviews.reduce(function (total, review) {
      return total + Number(review.rating);
    }, 0) / reviews.length
    : destination.baseRating;
  summary.textContent = starText(average) +
    " " + formatRating(average) + "/5" +
    (reviews.length ? " · " + reviews.length + (reviews.length === 1 ? " review" : " reviews") : " · Current brochure rating");

  list.textContent = "";
  if (!reviews.length) {
    var emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-reviews";
    emptyMessage.textContent = "No written reviews yet. Be the first to share your experience!";
    list.appendChild(emptyMessage);
    return;
  }

  reviews.slice().reverse().forEach(function (review) {
    var card = document.createElement("article");
    card.className = "review-card";

    var heading = document.createElement("div");
    heading.className = "review-card-heading";
    var reviewer = document.createElement("h3");
    reviewer.textContent = review.name;
    var stars = document.createElement("span");
    stars.className = "review-stars";
    stars.setAttribute("aria-label", review.rating + " out of 5 stars");
    stars.textContent = starText(Number(review.rating));
    heading.appendChild(reviewer);
    heading.appendChild(stars);

    var comment = document.createElement("p");
    comment.textContent = review.review;
    card.appendChild(heading);
    card.appendChild(comment);

    if (review.createdAt) {
      var date = document.createElement("time");
      date.className = "review-date";
      date.dateTime = review.createdAt;
      date.textContent = new Date(review.createdAt).toLocaleDateString();
      card.appendChild(date);
    }
    list.appendChild(card);
  });
}

function submitDestinationReview(event) {
  event.preventDefault();
  var form = event.currentTarget;
  var status = document.getElementById("review-status");
  var destinationId = new URLSearchParams(window.location.search).get("destination");
  var name = document.getElementById("reviewer-name").value.trim();
  var reviewText = document.getElementById("review-text").value.trim();
  var selectedRating = form.querySelector('input[name="rating"]:checked');

  if (!DESTINATIONS[destinationId]) {
    status.textContent = "Choose a valid destination before submitting a review.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }
  if (!name || !reviewText || !selectedRating) {
    status.textContent = "Enter your name, choose a star rating, and write a review.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }

  var reviewStore;
  try {
    reviewStore = readReviewStore();
    var reviews = getDestinationReviews(reviewStore, destinationId);
    reviews.push({
      name: name,
      rating: Number(selectedRating.value),
      review: reviewText,
      createdAt: new Date().toISOString()
    });
    reviewStore[destinationId] = reviews;
    window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewStore));
  } catch (error) {
    status.textContent = "Your review could not be saved. " + error.message;
    status.className = "form-message review-error";
    status.style.display = "block";
    console.error("Unable to save review:", error);
    return;
  }

  status.textContent = "Thank you! Your review has been saved in this browser.";
  status.className = "form-message review-success";
  status.style.display = "block";
  form.reset();
  renderDestinationReviews(destinationId);
  status.textContent = "Thank you! Your review has been saved in this browser.";
  status.className = "form-message review-success";
  status.style.display = "block";
}

/* --- DYNAMIC COMMENTS / SUGGESTIONS FUNCTION --- */
function addComment(event) {
  event.preventDefault();

  var nameInput = document.getElementById("comment-name");
  var textInput = document.getElementById("comment-text");
  var commentList = document.getElementById("comment-list");

  if (commentList.innerHTML.includes("No comments yet")) {
    commentList.innerHTML = "";
  }

  var newBox = document.createElement("div");
  newBox.style.background = "#fff8ec";
  newBox.style.padding = "15px";
  newBox.style.marginBottom = "10px";
  newBox.style.borderLeft = "4px solid #f6a53a";
  newBox.style.border = "1px solid #ead9c1";

  newBox.innerHTML = `
    <strong style="color: #173f57; font-size: 16px;">${nameInput.value}</strong>
    <p style="margin: 5px 0 0; color: #526977; font-size: 14px;">${textInput.value}</p>
  `;

  commentList.insertBefore(newBox, commentList.firstChild);

  nameInput.value = "";
  textInput.value = "";
}

/* --- FAQ ACCORDION FUNCTION --- */
function toggleFaq(question) {
  var answer = question.nextElementSibling;

  if (answer.className.indexOf("open") === -1) {
    answer.className = "faq-answer open";
    question.className = "faq-question open";
  } else {
    answer.className = "faq-answer";
    question.className = "faq-question";
  }
}

function applyRevealEffects() {
  var revealTargets = document.querySelectorAll(".page-intro h1, .section-heading, .feature-card, .guide-row, .team-card, .album-card, .review-card, .submitted-note-card, .about-group-photo");

  if (!revealTargets.length || !window.IntersectionObserver) {
    revealTargets.forEach(function (element) {
      element.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries, currentObserver) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach(function (element) {
    element.classList.add("reveal");
    observer.observe(element);
  });

  var heroTitle = document.querySelector(".hero h1, .page-intro h1");
  if (heroTitle) {
    heroTitle.classList.add("slide-up");
    setTimeout(function () {
      heroTitle.classList.add("is-visible");
    }, 120);
  }
}

/* --- PAGE INITIALIZATION (Connects menu & FAQ buttons) --- */
function preparePage() {
  var menuButton = document.getElementById("menu-button");
  if (menuButton) {
    menuButton.onclick = showMobileMenu;
  }

  var music = document.getElementById("travel-music");
  var musicPlayer = document.querySelector(".music-player");
  var musicControl = document.getElementById("music-control");
  var musicStatus = document.getElementById("music-player-status");
  if (music && musicPlayer && musicControl && musicStatus) {
    function updateMusicPlayer() {
      var isPlaying = !music.paused && !music.ended;
      musicPlayer.setAttribute("data-playing", String(isPlaying));
      musicControl.setAttribute("aria-pressed", String(isPlaying));
      musicControl.setAttribute("aria-label", isPlaying
        ? "Pause happy instrumental background music"
        : "Play happy instrumental background music");
      musicControl.title = isPlaying ? "Pause music" : "Play music";
      musicStatus.textContent = isPlaying ? "Now playing" : "Ready when you are";
    }

    musicControl.addEventListener("click", function () {
      if (music.paused) {
        music.play().catch(function (error) {
          musicStatus.textContent = "Music could not be played";
          console.error("Unable to play background music:", error);
        });
      } else {
        music.pause();
      }
    });

    music.addEventListener("play", updateMusicPlayer);
    music.addEventListener("pause", updateMusicPlayer);
    music.addEventListener("ended", updateMusicPlayer);
    music.addEventListener("error", function () {
      musicStatus.textContent = "Music file could not be loaded";
      console.error("Unable to load background music:", music.error);
    });
    updateMusicPlayer();
  }

  var questions = document.getElementsByClassName("faq-question");
  for (var i = 0; i < questions.length; i++) {
    questions[i].onclick = function () {
      toggleFaq(this);
    };
  }

  var albumToggles = document.getElementsByClassName("album-toggle");
  for (var i = 0; i < albumToggles.length; i++) {
    albumToggles[i].addEventListener("click", function () {
      var card = this.closest(".album-card");
      var isOpen = card.classList.contains("is-open");

      card.classList.toggle("is-open", !isOpen);
      this.setAttribute("aria-expanded", String(!isOpen));
      this.textContent = isOpen ? "View description" : "Hide description";
    });
  }

  var reviewForm = document.getElementById("destination-review-form");
  if (reviewForm) {
    reviewForm.addEventListener("submit", submitDestinationReview);
    renderDestinationReviews(new URLSearchParams(window.location.search).get("destination"));
  }

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", submitContactNote);
    renderContactNotes();
  }

  applyRevealEffects();
}

window.onload = preparePage;
