var sharedCommentsCollection = null;
var sharedDatabase = null;
var DESTINATIONS = {
  banaue: { name: "Banaue Rice Terraces (Ifugao)", baseRating: 5 },
  intramuros: { name: "Intramuros (Manila)", baseRating: 4.5 },
  boracay: { name: "Boracay Island (Aklan)", baseRating: 5 },
  bohol: { name: "Bohol", baseRating: 5 },
  siargao: { name: "Siargao Island (Surigao del Norte)", baseRating: 5 },
  samal: { name: "Samal (Davao City)", baseRating: 4.5 }
};

function renderContactNotes() {
  var noteList = document.getElementById("submitted-note-list");
  if (!noteList) {
    return;
  }

  if (!sharedDatabase) {
    noteList.textContent = "Shared notes are unavailable until Firebase is configured.";
    return;
  }

  sharedDatabase.collection("contactNotes")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot(function (snapshot) {
      try {
        noteList.textContent = "";
        if (snapshot.empty) {
          var emptyMessage = document.createElement("p");
          emptyMessage.className = "notes-empty";
          emptyMessage.textContent = "No notes yet. Be the first to share a travel idea!";
          noteList.appendChild(emptyMessage);
          return;
        }

        snapshot.forEach(function (documentSnapshot) {
          var note = documentSnapshot.data();
          if (!note || typeof note.name !== "string" ||
              typeof note.topic !== "string" || typeof note.message !== "string") {
            throw new Error("A saved note has invalid details.");
          }

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
          if (note.createdAt && typeof note.createdAt.toDate === "function") {
            var date = document.createElement("time");
            date.className = "submitted-note-date";
            date.dateTime = note.createdAt.toDate().toISOString();
            date.textContent = note.createdAt.toDate().toLocaleDateString();
            card.appendChild(date);
          }
          noteList.appendChild(card);
        });
      } catch (error) {
        noteList.textContent = "A saved note could not be displayed. " + error.message;
        console.error("Unable to display shared contact notes:", error);
      }
    }, function (error) {
      noteList.textContent = "Shared notes could not be loaded. Check your Firestore database and rules.";
      console.error("Unable to load shared contact notes:", error);
    });
}

async function submitContactNote(event) {
  event.preventDefault();
  var form = event.currentTarget;
  var status = document.getElementById("form-message");
  var name = document.getElementById("visitor-name").value.trim();
  var topicSelect = document.getElementById("topic");
  var message = document.getElementById("visitor-message").value.trim();

  if (!sharedDatabase) {
    status.textContent = "Shared notes are not connected. Configure Firebase before submitting.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }
  if (!name || name.length > 80 || !message || message.length > 1500) {
    status.textContent = "Use a name up to 80 characters and a message up to 1,500 characters.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }

  var submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  status.textContent = "Submitting your note...";
  status.className = "form-message";
  status.style.display = "block";
  try {
    await sharedDatabase.collection("contactNotes").add({
      name: name,
      topic: topicSelect.options[topicSelect.selectedIndex].text,
      message: message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    form.reset();
    status.textContent = "Your note was saved and is visible to other visitors.";
    status.className = "form-message review-success";
  } catch (error) {
    status.textContent = "Your note could not be saved. Check your Firestore rules and internet connection.";
    status.className = "form-message review-error";
    console.error("Unable to save shared contact note:", error);
  } finally {
    submitButton.disabled = false;
  }
  status.style.display = "block";
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
  if (!ratings.length || !sharedDatabase) {
    return;
  }

  sharedDatabase.collection("reviews").get().then(function (snapshot) {
    var reviewsByDestination = {};
    snapshot.forEach(function (documentSnapshot) {
      var review = documentSnapshot.data();
      if (review && DESTINATIONS[review.destinationId] &&
          Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) {
        reviewsByDestination[review.destinationId] =
          reviewsByDestination[review.destinationId] || [];
        reviewsByDestination[review.destinationId].push(review.rating);
      }
    });

    for (var i = 0; i < ratings.length; i++) {
      var destinationId = ratings[i].getAttribute("data-destination-rating");
      var destinationRatings = reviewsByDestination[destinationId] || [];
      if (destinationRatings.length) {
        var average = destinationRatings.reduce(function (total, rating) {
          return total + rating;
        }, 0) / destinationRatings.length;
        ratings[i].textContent = "Ratings: " +
          starText(average) +
          " (" + formatRating(average) + "/5)";
      }
    }
  }).catch(function (error) {
    console.error("Unable to load shared destination ratings:", error);
    var regionDisplay = document.getElementById("region-display");
    if (regionDisplay) {
      var errorMessage = document.createElement("p");
      errorMessage.className = "form-message review-error";
      errorMessage.textContent = "Shared ratings could not be loaded. Check your Firestore database and rules.";
      errorMessage.style.display = "block";
      regionDisplay.insertBefore(errorMessage, regionDisplay.firstChild);
    }
  });
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

function loadSharedFirebase() {
  if (sharedDatabase) {
    return true;
  }
  if (!window.FIREBASE_CONFIG ||
      Object.keys(window.FIREBASE_CONFIG).some(function (key) {
        return typeof window.FIREBASE_CONFIG[key] !== "string" ||
          !window.FIREBASE_CONFIG[key] ||
          window.FIREBASE_CONFIG[key].indexOf("PASTE_") !== -1;
      })) {
    return false;
  }
  if (!window.firebase || !firebase.firestore) {
    console.error("Firebase SDK is unavailable.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    sharedDatabase = firebase.firestore();
    return true;
  } catch (error) {
    console.error("Unable to initialize Firebase:", error);
    return false;
  }
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

  if (!sharedDatabase) {
    status.textContent = "Shared reviews are not set up. Add your Firebase web app config to firebase-config.js.";
    status.className = "form-message review-error";
    status.style.display = "block";
    list.textContent = "Reviews are unavailable until Firebase is configured.";
    form.hidden = true;
    return;
  }

  sharedDatabase.collection("reviews")
    .where("destinationId", "==", destinationId)
    .onSnapshot(function (snapshot) {
      try {
        var reviews = [];
        snapshot.forEach(function (documentSnapshot) {
          var review = documentSnapshot.data();
          if (!review || typeof review.name !== "string" ||
              typeof review.review !== "string" ||
              !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
            throw new Error("A saved review has invalid details.");
          }
          review.createdAt = review.createdAt && typeof review.createdAt.toDate === "function"
            ? review.createdAt.toDate().toISOString()
            : "";
          reviews.push(review);
        });
        reviews.sort(function (first, second) {
          return (second.createdAt || "").localeCompare(first.createdAt || "");
        });
        displayDestinationReviews(destination, reviews, summary, list);
        status.textContent = "";
        status.style.display = "none";
      } catch (error) {
        status.textContent = "A saved review could not be displayed. " + error.message;
        status.className = "form-message review-error";
        status.style.display = "block";
        console.error("Unable to display shared reviews:", error);
      }
    }, function (error) {
      status.textContent = "Shared reviews could not be loaded. Check your Firestore database and rules.";
      status.className = "form-message review-error";
      status.style.display = "block";
      list.textContent = "Reviews are unavailable until the shared review data can be read.";
      console.error("Unable to load shared reviews:", error);
    });
}

function displayDestinationReviews(destination, reviews, summary, list) {
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

  reviews.forEach(function (review) {
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

async function submitDestinationReview(event) {
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

  if (!sharedDatabase) {
    status.textContent = "Shared reviews are not connected. Configure Firebase before submitting.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }
  var rating = Number(selectedRating.value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 ||
      name.length > 60 || reviewText.length > 1000) {
    status.textContent = "Use a name up to 60 characters and a review up to 1,000 characters.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }

  var submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  status.textContent = "Submitting your review...";
  status.className = "form-message";
  status.style.display = "block";
  try {
    await sharedDatabase.collection("reviews").add({
      destinationId: destinationId,
      name: name,
      rating: rating,
      review: reviewText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    form.reset();
    status.textContent = "Your review was saved and is visible to other visitors.";
    status.className = "form-message review-success";
    status.style.display = "block";
  } catch (error) {
    status.textContent = "Your review could not be saved. Check your Firestore rules and internet connection.";
    status.className = "form-message review-error";
    status.style.display = "block";
    console.error("Unable to save shared review:", error);
  } finally {
    submitButton.disabled = false;
  }
}

/* --- DYNAMIC COMMENTS / SUGGESTIONS FUNCTION --- */
function setCommentStatus(message, isError) {
  var status = document.getElementById("comment-status");
  if (!status) {
    return;
  }
  status.textContent = message;
  status.className = isError ? "form-message review-error" : "form-message";
  status.style.display = "block";
}

function renderSharedComments(snapshot) {
  var commentList = document.getElementById("comment-list");
  commentList.textContent = "";

  if (snapshot.empty) {
    var emptyMessage = document.createElement("p");
    emptyMessage.className = "notes-empty";
    emptyMessage.textContent = "No comments yet. Be the first to leave one!";
    commentList.appendChild(emptyMessage);
    return;
  }

  snapshot.forEach(function (documentSnapshot) {
    var comment = documentSnapshot.data();
    if (!comment || typeof comment.name !== "string" ||
      typeof comment.message !== "string") {
      throw new Error("A saved comment has invalid details.");
    }

    var card = document.createElement("article");
    card.className = "submitted-note-card";

    var heading = document.createElement("div");
    heading.className = "submitted-note-heading";
    var name = document.createElement("h3");
    name.textContent = comment.name;
    heading.appendChild(name);

    var message = document.createElement("p");
    message.textContent = comment.message;
    card.appendChild(heading);
    card.appendChild(message);

    if (comment.createdAt && typeof comment.createdAt.toDate === "function") {
      var date = document.createElement("time");
      date.className = "submitted-note-date";
      date.dateTime = comment.createdAt.toDate().toISOString();
      date.textContent = comment.createdAt.toDate().toLocaleDateString();
      card.appendChild(date);
    }
    commentList.appendChild(card);
  });
}

function connectSharedComments() {
  var form = document.getElementById("comment-form");
  if (!form) {
    return;
  }

  var submitButton = form.querySelector('button[type="submit"]');
  if (!loadSharedFirebase()) {
    setCommentStatus("Shared comments are not set up yet. Add your Firebase web app config to firebase-config.js.", true);
    if (submitButton) {
      submitButton.disabled = true;
    }
    return;
  }

  try {
    sharedCommentsCollection = sharedDatabase
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(50);
    sharedCommentsCollection.onSnapshot(function (snapshot) {
      try {
        renderSharedComments(snapshot);
        setCommentStatus("Comments are shared with everyone who visits this site.", false);
      } catch (error) {
        setCommentStatus("A saved comment could not be displayed. " + error.message, true);
        console.error("Unable to display shared comments:", error);
      }
    }, function (error) {
      setCommentStatus("Comments could not be loaded. Check your Firestore database and rules.", true);
      console.error("Unable to load shared comments:", error);
    });
  } catch (error) {
    setCommentStatus("Firebase could not be initialized. Check firebase-config.js.", true);
    console.error("Unable to initialize Firebase comments:", error);
  }
}

async function addComment(event) {
  event.preventDefault();

  var nameInput = document.getElementById("comment-name");
  var textInput = document.getElementById("comment-text");
  var name = nameInput.value.trim();
  var message = textInput.value.trim();

  if (!sharedCommentsCollection) {
    setCommentStatus("Comments are not connected yet. Configure Firebase before submitting.", true);
    return;
  }
  if (!name || name.length > 60 || !message || message.length > 1000) {
    setCommentStatus("Enter a name (up to 60 characters) and a comment (up to 1,000 characters).", true);
    return;
  }

  var submitButton = event.currentTarget.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  setCommentStatus("Submitting your comment...", false);

  try {
    await firebase.firestore().collection("comments").add({
      name: name,
      message: message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    event.currentTarget.reset();
    setCommentStatus("Your comment was saved and is visible to other visitors.", false);
  } catch (error) {
    setCommentStatus("Your comment could not be saved. Check your Firestore rules and internet connection.", true);
    console.error("Unable to save shared comment:", error);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

function connectContactNotes() {
  var form = document.getElementById("contact-form");
  if (!form) {
    return;
  }
  if (!loadSharedFirebase()) {
    var status = document.getElementById("form-message");
    status.textContent = "Shared notes are not set up yet. Add your Firebase web app config to firebase-config.js.";
    status.className = "form-message review-error";
    status.style.display = "block";
    form.querySelector('button[type="submit"]').disabled = true;
    document.getElementById("submitted-note-list").textContent =
      "Shared notes are unavailable until Firebase is configured.";
    return;
  }
  form.addEventListener("submit", submitContactNote);
  var status = document.getElementById("form-message");
  status.textContent = "Notes are shared with visitors on every device.";
  status.className = "form-message review-success";
  status.style.display = "block";
  renderContactNotes();
}

function connectDestinationReviews() {
  var form = document.getElementById("destination-review-form");
  if (!form) {
    return;
  }
  var status = document.getElementById("review-status");
  if (!loadSharedFirebase()) {
    status.textContent = "Shared reviews are not set up yet. Add your Firebase web app config to firebase-config.js.";
    status.className = "form-message review-error";
    status.style.display = "block";
    form.hidden = true;
    return;
  }
  form.addEventListener("submit", submitDestinationReview);
  status.textContent = "Loading shared reviews...";
  status.className = "form-message";
  status.style.display = "block";
  renderDestinationReviews(new URLSearchParams(window.location.search).get("destination"));
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
    connectDestinationReviews();
  }

  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    connectContactNotes();
  }

  connectSharedComments();
  applyRevealEffects();
}

window.onload = preparePage;
