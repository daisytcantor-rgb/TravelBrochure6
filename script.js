var sharedCommentsCollection = null;
var sharedDatabase = null;
var DESTINATIONS = {
  banaue: { name: "Banaue Rice Terraces (Ifugao)", description: "Amazing mountain terraces carved by ancestors with great care.", food: "Tinawon Red Rice", baseRating: 5 },
  intramuros: { name: "Intramuros (Manila)", description: "The historic Walled City of Manila. Walk through cobblestone streets, ride a bamboo bike or kalesa, and visit Fort Santiago where Dr. Jose Rizal was imprisoned.", food: "Halo Halo", baseRating: 4.5 },
  boracay: { name: "Boracay Island (Aklan)", description: "World-famous for its bright white powdery sand beach and clear waters.", food: "Chori Burger, Fresh Seafood", baseRating: 5 },
  bohol: { name: "Bohol", description: "A rich blend of history, heritage spots, waterfalls, and island beaches.", food: "Peanut Kisses", baseRating: 5 },
  siargao: { name: "Siargao Island (Surigao del Norte)", description: "The Surfing Capital of the Philippines with stunning blue horizons.", food: "Kinilaw", baseRating: 5 },
  samal: { name: "Samal (Davao City)", description: "A volcanic island known for sweet lanzones fruits and springs.", food: "Durian", baseRating: 4.5 }
};

function readTravelogueStorage(key, fallback) {
  var value = localStorage.getItem(key);
  if (!value) {
    return fallback;
  }
  try {
    var parsed = JSON.parse(value);
    return parsed === null ? fallback : parsed;
  } catch (error) {
    console.error("Unable to read " + key + " from localStorage:", error);
    return fallback;
  }
}

function cacheTravelogueRecords(key, records) {
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (error) {
    console.error("Unable to cache " + key + " in this browser:", error);
  }
}

function destinationText(destinationId, field) {
  var savedDestinations = readTravelogueStorage("phTravelogueDestinations", {});
  var saved = savedDestinations[destinationId];
  var text = saved && typeof saved[field] === "string"
    ? saved[field]
    : DESTINATIONS[destinationId][field];
  return text.replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character];
  });
}

function renderCustomDestinations() {
  var section = document.getElementById("custom-destinations-section");
  var container = document.getElementById("custom-destinations");
  if (!section || !container) {
    return;
  }
  var destinations = readTravelogueStorage("phTravelogueCustomDestinations", []);
  container.textContent = "";
  if (!Array.isArray(destinations) || !destinations.length) {
    section.hidden = true;
    return;
  }

  destinations.forEach(function (destination) {
    if (!destination || typeof destination.name !== "string" ||
        typeof destination.location !== "string" ||
        typeof destination.description !== "string" ||
        typeof destination.foodName !== "string" ||
        typeof destination.foodDescription !== "string") {
      return;
    }
    var card = document.createElement("article");
    card.className = "custom-destination-card";
    var placeImage = document.createElement("img");
    placeImage.className = "custom-destination-place-image";
    placeImage.alt = destination.name;
    if (typeof destination.placeImage === "string" &&
        /^data:image\/(jpeg|png|webp);base64,/.test(destination.placeImage)) {
      placeImage.src = destination.placeImage;
    }
    card.appendChild(placeImage);
    var content = document.createElement("div");
    content.className = "custom-destination-content";
    var title = document.createElement("h3");
    title.textContent = destination.name;
    content.appendChild(title);
    var location = document.createElement("p");
    location.className = "custom-destination-location";
    location.textContent = destination.location;
    content.appendChild(location);
    var description = document.createElement("p");
    description.textContent = destination.description;
    content.appendChild(description);
    var foodImage = document.createElement("img");
    foodImage.className = "custom-destination-food-image";
    foodImage.alt = destination.foodName;
    if (typeof destination.foodImage === "string" &&
        /^data:image\/(jpeg|png|webp);base64,/.test(destination.foodImage)) {
      foodImage.src = destination.foodImage;
    }
    content.appendChild(foodImage);
    var foodTitle = document.createElement("h4");
    foodTitle.textContent = destination.foodName;
    content.appendChild(foodTitle);
    var foodDescription = document.createElement("p");
    foodDescription.textContent = destination.foodDescription;
    content.appendChild(foodDescription);
    card.appendChild(content);
    container.appendChild(card);
  });
  section.hidden = container.childElementCount === 0;
}

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
        var cachedNotes = [];
        if (snapshot.empty) {
          cacheTravelogueRecords("phTravelogueContactNotes", cachedNotes);
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
          cachedNotes.push({
            id: documentSnapshot.id,
            name: note.name,
            topic: note.topic,
            message: note.message,
            createdAt: note.createdAt && typeof note.createdAt.toDate === "function"
              ? note.createdAt.toDate().toISOString()
              : ""
          });

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
          if (typeof note.photo === "string" &&
              /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(note.photo) &&
              note.photo.length <= 550000) {
            var photo = document.createElement("img");
            photo.className = "submitted-note-photo";
            photo.src = note.photo;
            photo.alt = "Photo shared by " + note.name;
            card.appendChild(photo);
          }
          if (note.createdAt && typeof note.createdAt.toDate === "function") {
            var date = document.createElement("time");
            date.className = "submitted-note-date";
            date.dateTime = note.createdAt.toDate().toISOString();
            date.textContent = note.createdAt.toDate().toLocaleDateString();
            card.appendChild(date);
          }
          noteList.appendChild(card);
        });
        cacheTravelogueRecords("phTravelogueContactNotes", cachedNotes);
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
  var photoInput = document.getElementById("visitor-photo");
  var photoFile = photoInput.files && photoInput.files[0];
  var allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!sharedDatabase) {
    status.textContent = "Shared notes are not connected. Configure Firebase before submitting.";
    status.className = "form-message review-error";
    status.style.display = "block";
    return;
  }
  if (photoFile && (allowedPhotoTypes.indexOf(photoFile.type) === -1 || photoFile.size > 400 * 1024)) {
    status.textContent = "Choose a JPG, PNG, or WebP photo that is no larger than 400 KB.";
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
    var photoData = "";
    if (photoFile) {
      try {
        photoData = await new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            if (typeof reader.result !== "string" ||
                !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(reader.result)) {
              reject(new Error("The selected photo could not be read as a supported image."));
              return;
            }
            resolve(reader.result);
          };
          reader.onerror = function () {
            reject(reader.error || new Error("The selected photo could not be read."));
          };
          reader.readAsDataURL(photoFile);
        });
      } catch (error) {
        status.textContent = "The selected photo could not be read. Choose another JPG, PNG, or WebP image.";
        status.className = "form-message review-error";
        console.error("Unable to read visitor photo:", error);
        return;
      }
    }
    var note = {
      name: name,
      topic: topicSelect.options[topicSelect.selectedIndex].text,
      message: message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (photoData) {
      note.photo = photoData;
    }
    await sharedDatabase.collection("contactNotes").add(note);
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
    var cachedReviews = [];
    snapshot.forEach(function (documentSnapshot) {
      var review = documentSnapshot.data();
      if (review && DESTINATIONS[review.destinationId] &&
          Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) {
        cachedReviews.push({
          destinationId: review.destinationId,
          name: typeof review.name === "string" ? review.name : "",
          review: typeof review.review === "string" ? review.review : "",
          rating: review.rating,
          createdAt: review.createdAt && typeof review.createdAt.toDate === "function"
            ? review.createdAt.toDate().toISOString()
            : ""
        });
        reviewsByDestination[review.destinationId] =
          reviewsByDestination[review.destinationId] || [];
        reviewsByDestination[review.destinationId].push(review.rating);
      }
    });
    cacheTravelogueRecords("phTravelogueReviews", cachedReviews);

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
            <h3>1. ${destinationText("banaue", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("banaue", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("banaue", "food")}</p>
            ${ratingMarkup("banaue")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/7LqAJoD-PpA" title="Soar Over the Lush Rice Terraces of the Philippines | National Geographic" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Manila.png" alt="Manila">
          <div class="feature-card-content">
            <h3>2. ${destinationText("intramuros", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("intramuros", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("intramuros", "food")}</p>
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
            <h3>1. ${destinationText("boracay", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("boracay", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("boracay", "food")}</p>
            ${ratingMarkup("boracay")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/oVdGmgfeTeI" title="Aklan, Philippines" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Bohol.png" alt="Bohol">
          <div class="feature-card-content">
            <h3>2. ${destinationText("bohol", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("bohol", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("bohol", "food")}</p>
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
            <h3>1. ${destinationText("siargao", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("siargao", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("siargao", "food")}</p>
            ${ratingMarkup("siargao")}
            <iframe width="100%" height="200" src="https://www.youtube.com/embed/YuSAnPSOsZU" title="Top 7 Best Places in SURIGAO del Sur (2023) | The Lost Feet PH" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
          </div>
        </div>
        <div class="feature-card region-feature-card">
          <img src="Davao.png" alt="Davao">
          <div class="feature-card-content">
            <h3>2. ${destinationText("samal", "name")}</h3>
            <p><strong>Description:</strong> ${destinationText("samal", "description")}</p>
            <p><strong>Famous Foods:</strong> ${destinationText("samal", "food")}</p>
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
        cacheTravelogueRecords("phTravelogueReviews", reviews);
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

function getCommentOwner() {
  var session = window.TravelogueAuth ? window.TravelogueAuth.getSession() : null;
  if (session && typeof session.username === "string") {
    return "user:" + session.username.toLowerCase();
  }
  var owner = localStorage.getItem("phTravelogueVisitorId");
  if (!owner) {
    owner = "visitor:" + Date.now() + ":" + Math.random().toString(36).slice(2);
    localStorage.setItem("phTravelogueVisitorId", owner);
  }
  return owner;
}

function renderSharedComments(comments) {
  var commentList = document.getElementById("comment-list");
  if (!commentList) {
    return;
  }
  commentList.textContent = "";

  if (!comments.length) {
    var emptyMessage = document.createElement("p");
    emptyMessage.className = "notes-empty";
    emptyMessage.textContent = "No comments yet. Be the first to leave one!";
    commentList.appendChild(emptyMessage);
    return;
  }

  comments.forEach(function (comment) {
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

    if (comment.createdAt) {
      var date = document.createElement("time");
      date.className = "submitted-note-date";
      date.dateTime = comment.createdAt;
      date.textContent = new Date(comment.createdAt).toLocaleDateString();
      card.appendChild(date);
    }
    var session = window.TravelogueAuth ? window.TravelogueAuth.getSession() : null;
    if (comment.owner === getCommentOwner() || (session && session.role === "admin")) {
      var deleteButton = document.createElement("button");
      deleteButton.className = "button button-secondary comment-delete";
      deleteButton.type = "button";
      var isOwnComment = comment.owner === getCommentOwner();
      deleteButton.textContent = session && session.role === "admin" && !isOwnComment
        ? "Delete comment"
        : "Delete my comment";
      deleteButton.addEventListener("click", function () {
        if (!window.confirm("Delete this comment from this browser? This cannot be undone.")) {
          return;
        }
        var commentsFromStorage = readTravelogueStorage("phTravelogueComments", []);
        var remaining = commentsFromStorage.filter(function (savedComment) {
          return savedComment.id !== comment.id;
        });
        cacheTravelogueRecords("phTravelogueComments", remaining);
        renderSharedComments(remaining);
        setCommentStatus(isOwnComment
          ? "Your comment was deleted from this browser."
          : "The comment was deleted from this browser by the administrator.", false);
      });
      card.appendChild(deleteButton);
    }
    commentList.appendChild(card);
  });
}

function connectSharedComments() {
  var form = document.getElementById("comment-form");
  if (!form) {
    return;
  }
  var comments = readTravelogueStorage("phTravelogueComments", []);
  comments = comments.map(function (comment, index) {
    if (!comment.id) {
      comment.id = "legacy-comment-" + index + "-" + Date.now();
    }
    return comment;
  });
  cacheTravelogueRecords("phTravelogueComments", comments);
  renderSharedComments(comments);
  setCommentStatus("Comments are saved in this browser only.", false);
  window.addEventListener("storage", function (event) {
    if (event.key !== "phTravelogueComments") {
      return;
    }
    var updatedComments = readTravelogueStorage("phTravelogueComments", []);
    renderSharedComments(updatedComments);
  });
}

async function addComment(event) {
  event.preventDefault();

  var nameInput = document.getElementById("comment-name");
  var textInput = document.getElementById("comment-text");
  var name = nameInput.value.trim();
  var message = textInput.value.trim();

  if (!name || name.length > 60 || !message || message.length > 1000) {
    setCommentStatus("Enter a name (up to 60 characters) and a comment (up to 1,000 characters).", true);
    return;
  }

  try {
    var comments = readTravelogueStorage("phTravelogueComments", []);
    comments.unshift({
      id: "comment-" + Date.now() + "-" + Math.random().toString(36).slice(2),
      name: name,
      message: message,
      owner: getCommentOwner(),
      createdAt: new Date().toISOString()
    });
    event.currentTarget.reset();
    cacheTravelogueRecords("phTravelogueComments", comments);
    renderSharedComments(comments);
    setCommentStatus("Your comment was saved in this browser.", false);
  } catch (error) {
    setCommentStatus("Your comment could not be saved in this browser.", true);
    console.error("Unable to save local comment:", error);
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

function initializeInjectedChatbot() {
  var toggle = document.getElementById("chatbot-toggle");
  var panel = document.getElementById("chatbot-panel");
  var form = document.getElementById("chatbot-form");
  var input = document.getElementById("chatbot-input");
  var messages = document.getElementById("chatbot-messages");
  if (!toggle || !panel || !form || !input || !messages) {
    return;
  }

  function addMessage(label, text, className) {
    var message = document.createElement("p");
    message.className = "chat-message " + className;
    message.textContent = label + ": " + text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function answer(question) {
    var text = question.toLowerCase();
    var websiteKeywords = ["website", "travel brochure", "home page", "about us", "gallery", "contact", "faq", "login", "travelogue", "brochure", "site", "this website"];
    var hasWebsiteQuestion = websiteKeywords.some(function (keyword) { return text.indexOf(keyword) !== -1; });

    if (text.indexOf("travel brochure") !== -1 || text.indexOf("this website") !== -1 || text.indexOf("website") !== -1 || text.indexOf("travelogue") !== -1 || text.indexOf("brochure") !== -1) {
      return "This Travel Brochure website is a student-made Philippines travel guide. It includes the Home page, About Us, Travel Guides, Gallery, Contact, FAQ, and Login. It showcases destinations, local foods, island highlights, and travel ideas for visitors.";
    }

    if (text.indexOf("home") !== -1 || text.indexOf("about us") !== -1 || text.indexOf("gallery") !== -1 || text.indexOf("contact") !== -1 || text.indexOf("faq") !== -1 || text.indexOf("login") !== -1) {
      return "The site is organized into sections: Home for the landing page, About Us for the project story, Travel Guides for destination info, Gallery for pictures, Contact for messages, FAQ for common questions, and Login for the demo accounts and admin access.";
    }

    if (text.indexOf("palawan") !== -1 || text.indexOf("el nido") !== -1 || text.indexOf("coron") !== -1) {
      return "Palawan is known for limestone cliffs, turquoise lagoons, island hopping, and beaches in El Nido and Coron. It is one of the most popular island destinations in the Philippines.";
    } else if (text.indexOf("boracay") !== -1) {
      return "Boracay in Aklan is famous for White Beach, sunset views, water activities, and a lively island atmosphere. It is one of the Philippines' best-known beach destinations.";
    } else if (text.indexOf("bohol") !== -1) {
      return "Bohol is known for the Chocolate Hills, tarsiers, beaches, and Peanut Kisses. It combines nature, history, and island scenery.";
    } else if (text.indexOf("siargao") !== -1) {
      return "Siargao is a surfing destination, especially around Cloud 9, with lagoons, island tours, and stunning coastal scenery.";
    } else if (text.indexOf("banaue") !== -1 || text.indexOf("rice terrace") !== -1) {
      return "Banaue in Ifugao is known for its mountain rice terraces and rich Indigenous heritage. It is a historic cultural destination in the Cordillera.";
    } else if (text.indexOf("intramuros") !== -1 || text.indexOf("manila") !== -1) {
      return "Intramuros is Manila's historic Walled City, with Fort Santiago, heritage streets, museums, and old Spanish-era architecture.";
    } else if (text.indexOf("davao") !== -1 || text.indexOf("samal") !== -1) {
      return "Samal Island near Davao is known for beaches, resorts, island hopping, and relaxed island scenery.";
    } else if (text.indexOf("philippines") !== -1 || text.indexOf("island") !== -1 || text.indexOf("travel") !== -1) {
      return "The Philippines has many beautiful destinations, from island beaches in Boracay and Palawan to mountain terraces in Banaue, historic Manila sites, and island adventures in Siargao and Samal.";
    } else if (text.indexOf("hello") !== -1 || text.indexOf("hi") === 0 || text.indexOf("hey") === 0) {
      return "Hello! I can answer about this Travel Brochure website and the featured Philippine destinations like Palawan, Boracay, Bohol, Siargao, Banaue, Intramuros, and Samal.";
    }

    if (hasWebsiteQuestion) {
      return "This Travel Brochure website is a student-made travel journal for showcasing Philippine destinations and travel ideas. It has pages for the Home section, About Us, Travel Guides, Gallery, Contact, FAQ, and Login.";
    }

    return "I can help with this Travel Brochure website and its featured destinations. Ask me about the site pages, or one of these places: Palawan, Boracay, Bohol, Siargao, Banaue, Intramuros, or Samal.";
  }

  if (!messages.firstChild) {
    addMessage("Travel bot", "Hi! Ask me about Palawan, Boracay, Bohol, or another destination.", "chat-message-bot");
  }

  toggle.addEventListener("click", function () {
    var isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.setAttribute("aria-expanded", String(!isOpen));
    if (!isOpen) {
      input.focus();
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) {
      return;
    }
    addMessage("You", question, "chat-message-user");
    addMessage("Travel bot", answer(question), "chat-message-bot");
    input.value = "";
    input.focus();
  });
}

function ensureGlobalTravelFeatures() {
  if (!document.body) {
    return;
  }

  if (!document.getElementById("travel-music")) {
    var music = document.createElement("audio");
    music.id = "travel-music";
    music.autoplay = true;
    music.muted = true;
    music.loop = true;
    music.preload = "metadata";
    var musicSource = document.createElement("source");
    musicSource.src = "happy-ukulele.mp3";
    musicSource.type = "audio/mpeg";
    music.appendChild(musicSource);
    document.body.insertBefore(music, document.body.firstChild);
  }

  if (!document.querySelector(".music-player")) {
    var player = document.createElement("div");
    player.className = "music-player";
    player.setAttribute("data-playing", "false");
    player.innerHTML = '<div class="music-player-copy"><span class="music-player-kicker">Happy travel soundtrack</span><strong>Happy Ukulele</strong><span class="music-player-status" id="music-player-status" aria-live="polite">Ready when you are</span><span class="music-player-credit">Happy Ukulele by Jason Shaw · <a href="https://audionautix.com/" target="_blank" rel="noopener noreferrer">music by audionautix.com</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a></span></div><div class="music-visualizer" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><button class="music-control" id="music-control" type="button" aria-label="Unmute background music" aria-pressed="false" title="Unmute music"><span id="music-control-label">Unmute</span></button>';
    document.body.insertBefore(player, document.body.firstChild);
  }

  if (!document.getElementById("chatbot-toggle") && !document.getElementById("chatbot-form")) {
    var chatbot = document.createElement("div");
    chatbot.className = "chatbot";
    chatbot.innerHTML = '<div id="chatbot-panel" class="chatbot-panel" hidden><div class="chatbot-heading"><strong>Travel Brochure AI</strong><span>Ask about the website or any destination</span></div><div id="chatbot-messages" class="chatbot-messages" aria-live="polite"></div><form id="chatbot-form" class="chatbot-form"><label class="visually-hidden" for="chatbot-input">Ask about the travel brochure or a destination</label><input id="chatbot-input" type="text" maxlength="200" placeholder="Ask anything about the site or a place..." required><button class="button" type="submit">Send</button></form></div><button id="chatbot-toggle" class="chatbot-toggle" type="button" aria-label="Open Travel Brochure AI" aria-expanded="false">AI</button>';
    document.body.appendChild(chatbot);
    initializeInjectedChatbot();
  }
}

/* --- PAGE INITIALIZATION (Connects menu & FAQ buttons) --- */
function preparePage() {
  ensureGlobalTravelFeatures();
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
      var isMuted = music.muted;
      musicPlayer.setAttribute("data-playing", String(isPlaying));
      musicControl.setAttribute("aria-pressed", String(!isMuted));
      musicControl.setAttribute("aria-label", isMuted ? "Unmute background music" : "Mute background music");
      musicControl.title = isMuted ? "Unmute music" : "Mute music";
      document.getElementById("music-control-label").textContent = isMuted ? "Unmute" : "Mute";
      musicStatus.textContent = isPlaying
        ? (isMuted ? "Playing silently · unmute when ready" : "Now playing")
        : "Tap unmute to start the music";
    }

    musicControl.addEventListener("click", function () {
      if (music.paused) {
        music.muted = false;
        music.play().catch(function (error) {
          musicStatus.textContent = "Music could not be played";
          console.error("Unable to play background music:", error);
        });
      } else {
        music.muted = !music.muted;
      }
      updateMusicPlayer();
    });

    music.addEventListener("play", updateMusicPlayer);
    music.addEventListener("pause", updateMusicPlayer);
    music.addEventListener("ended", updateMusicPlayer);
    music.addEventListener("volumechange", updateMusicPlayer);
    music.addEventListener("error", function () {
      musicStatus.textContent = "Music file could not be loaded";
      console.error("Unable to load background music:", music.error);
    });
    updateMusicPlayer();
    music.play().catch(function (error) {
      musicStatus.textContent = "Tap unmute to start the music";
      console.info("Background music autoplay was blocked by the browser:", error);
    });
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
  renderCustomDestinations();
  applyRevealEffects();
}

window.onload = preparePage;
