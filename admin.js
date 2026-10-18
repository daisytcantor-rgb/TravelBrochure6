(function () {
  window.TravelogueAuth.ready.then(function () {
    var session = window.TravelogueAuth.protectPage("admin");
    if (!session) {
      return;
    }

  var destinations = {
    banaue: { name: "Banaue Rice Terraces (Ifugao)", description: "Amazing mountain terraces carved by ancestors with great care.", food: "Tinawon Red Rice" },
    intramuros: { name: "Intramuros (Manila)", description: "The historic Walled City of Manila, with cobblestone streets and Fort Santiago.", food: "Halo-halo" },
    boracay: { name: "Boracay Island (Aklan)", description: "World-famous for its bright white powdery sand beach and clear waters.", food: "Chori Burger, Fresh Seafood" },
    bohol: { name: "Bohol", description: "A rich blend of history, heritage spots, waterfalls, and island beaches.", food: "Peanut Kisses" },
    siargao: { name: "Siargao Island (Surigao del Norte)", description: "The surfing capital of the Philippines with stunning blue horizons.", food: "Kinilaw" },
    samal: { name: "Samal (Davao City)", description: "A volcanic island known for sweet lanzones fruits and springs.", food: "Durian" }
  };
  var DESTINATIONS_KEY = "phTravelogueDestinations";
  var CUSTOM_DESTINATIONS_KEY = "phTravelogueCustomDestinations";
  var GALLERY_PHOTOS_KEY = "phTravelogueGalleryPhotos";
  var GALLERY_DESTINATIONS = {
    intramuros: "Manila, Intramuros",
    banaue: "Banaue, Rice Terraces",
    boracay: "Boracay, Aklan",
    bohol: "Bohol",
    siargao: "Siargao",
    samal: "Davao City / Samal"
  };
  var DESTINATION_DEFAULTS = JSON.parse(JSON.stringify(destinations));
  var savedDestinations = readStorage(DESTINATIONS_KEY, {});
  Object.keys(destinations).forEach(function (id) {
    if (savedDestinations[id]) {
      destinations[id] = Object.assign({}, destinations[id], savedDestinations[id]);
    }
  });

  document.getElementById("admin-dashboard").hidden = false;
  document.getElementById("admin-username").textContent = session.username;
  document.getElementById("logout-button").addEventListener("click", window.TravelogueAuth.logout);
  initializeCustomDestinations();
  initializeGalleryPhotoManager();

  function readStorage(key, fallback) {
    var raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    try {
      var parsed = JSON.parse(raw);
      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.error("Unable to read " + key + " from localStorage:", error);
      return fallback;
    }
  }

  function makeCard(title, details) {
    var card = document.createElement("article");
    card.className = "submitted-note-card";
    var heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);
    var message = document.createElement("p");
    message.textContent = details;
    card.appendChild(message);
    return card;
  }

  function setNewDestinationStatus(message, isError) {
    var status = document.getElementById("new-destination-status");
    status.textContent = message;
    status.className = isError ? "form-message review-error" : "form-message review-success";
    status.style.display = "block";
  }

  function readImageFile(file, label, maxSize) {
    var sizeLimit = typeof maxSize === "number" ? maxSize : 400 * 1024;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        reject(new Error("Choose a JPG, PNG, or WebP image for the " + label + "."));
        return;
      }
      if (file.size > sizeLimit) {
        reject(new Error("The " + label + " image must be " + Math.floor(sizeLimit / 1024) + " KB or smaller."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result !== "string") {
          reject(new Error("The " + label + " image could not be read."));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error("The " + label + " image could not be read."));
      };
      reader.readAsDataURL(file);
    });
  }

  function readGalleryPhotos() {
    var photos = readStorage(GALLERY_PHOTOS_KEY, {});
    return photos && typeof photos === "object" && !Array.isArray(photos) ? photos : {};
  }

  function setGalleryPhotoStatus(message, isError) {
    var status = document.getElementById("gallery-photo-status");
    status.textContent = message;
    status.className = isError ? "form-message review-error" : "form-message review-success";
    status.style.display = "block";
  }

  function renderAdminGalleryPhotos() {
    var container = document.getElementById("admin-gallery-photos");
    var photosByDestination = readGalleryPhotos();
    container.textContent = "";

    Object.keys(GALLERY_DESTINATIONS).forEach(function (destinationId) {
      var photos = Array.isArray(photosByDestination[destinationId])
        ? photosByDestination[destinationId].slice(0, 3)
        : [];
      var card = document.createElement("article");
      card.className = "admin-gallery-photo-card";
      var heading = document.createElement("h3");
      heading.textContent = GALLERY_DESTINATIONS[destinationId] +
        " · " + photos.length + "/3 extra photos";
      card.appendChild(heading);

      if (!photos.length) {
        var emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No extra photos added yet.";
        card.appendChild(emptyMessage);
      } else {
        var preview = document.createElement("div");
        preview.className = "admin-gallery-photo-list";
        photos.forEach(function (photo, index) {
          if (!photo || typeof photo.data !== "string" ||
              !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.data) ||
              photo.data.length > 140000) {
            console.error("Skipping invalid saved gallery photo for " + destinationId + ".");
            return;
          }
          var item = document.createElement("div");
          item.className = "admin-gallery-photo-item";
          var image = document.createElement("img");
          image.src = photo.data;
          image.alt = "Extra photo " + (index + 1) + " for " + GALLERY_DESTINATIONS[destinationId];
          item.appendChild(image);
          var remove = document.createElement("button");
          remove.className = "button button-secondary";
          remove.type = "button";
          remove.textContent = "Remove photo";
          remove.addEventListener("click", function () {
            if (!window.confirm("Remove this extra photo from " + GALLERY_DESTINATIONS[destinationId] + "?")) {
              return;
            }
            var updatedPhotos = readGalleryPhotos();
            updatedPhotos[destinationId] = (Array.isArray(updatedPhotos[destinationId])
              ? updatedPhotos[destinationId]
              : []).filter(function (savedPhoto) {
              return savedPhoto.id !== photo.id;
            });
            if (!updatedPhotos[destinationId].length) {
              delete updatedPhotos[destinationId];
            }
            try {
              localStorage.setItem(GALLERY_PHOTOS_KEY, JSON.stringify(updatedPhotos));
              renderAdminGalleryPhotos();
              setGalleryPhotoStatus("Extra photo removed from " + GALLERY_DESTINATIONS[destinationId] + ".", false);
            } catch (error) {
              setGalleryPhotoStatus("The photo could not be removed from browser storage.", true);
              console.error("Unable to remove gallery photo:", error);
            }
          });
          item.appendChild(remove);
          preview.appendChild(item);
        });
        card.appendChild(preview);
      }
      container.appendChild(card);
    });
  }

  function initializeGalleryPhotoManager() {
    var form = document.getElementById("gallery-photo-form");
    var destinationSelect = document.getElementById("gallery-photo-destination");
    var fileInput = document.getElementById("gallery-photo-files");

    Object.keys(GALLERY_DESTINATIONS).forEach(function (destinationId) {
      var option = document.createElement("option");
      option.value = destinationId;
      option.textContent = GALLERY_DESTINATIONS[destinationId];
      destinationSelect.appendChild(option);
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var destinationId = destinationSelect.value;
      var selectedFiles = Array.prototype.slice.call(fileInput.files || []);
      var savedPhotos = readGalleryPhotos();
      var currentPhotos = Array.isArray(savedPhotos[destinationId]) ? savedPhotos[destinationId] : [];
      var submitButton = form.querySelector('button[type="submit"]');

      if (!GALLERY_DESTINATIONS[destinationId]) {
        setGalleryPhotoStatus("Select a valid gallery destination.", true);
        return;
      }
      if (selectedFiles.length < 1 || selectedFiles.length > 3) {
        setGalleryPhotoStatus("Choose between 1 and 3 photos to add.", true);
        return;
      }
      if (currentPhotos.length + selectedFiles.length > 3) {
        setGalleryPhotoStatus(
          GALLERY_DESTINATIONS[destinationId] + " already has " + currentPhotos.length +
          " extra photos. Remove a photo or choose " + (3 - currentPhotos.length) + " or fewer.",
          true
        );
        return;
      }

      submitButton.disabled = true;
      setGalleryPhotoStatus("Reading and saving extra gallery photos...", false);
      try {
        var newPhotos = await Promise.all(selectedFiles.map(function (file, index) {
          return readImageFile(file, "extra photo " + (index + 1), 100 * 1024).then(function (data) {
            return {
              id: "gallery-photo-" + Date.now() + "-" + index + "-" + Math.random().toString(36).slice(2),
              data: data
            };
          });
        }));
        savedPhotos[destinationId] = currentPhotos.concat(newPhotos);
        localStorage.setItem(GALLERY_PHOTOS_KEY, JSON.stringify(savedPhotos));
        form.reset();
        renderAdminGalleryPhotos();
        setGalleryPhotoStatus(
          newPhotos.length + (newPhotos.length === 1 ? " extra photo added to " : " extra photos added to ") +
          GALLERY_DESTINATIONS[destinationId] + ". Refresh the Gallery page in this browser to see them.",
          false
        );
      } catch (error) {
        setGalleryPhotoStatus(
          error.message || "The photos could not be saved. Browser storage may be full.",
          true
        );
        console.error("Unable to add gallery photos:", error);
      } finally {
        submitButton.disabled = false;
      }
    });

    renderAdminGalleryPhotos();
  }

  function renderCustomDestinations() {
    var list = document.getElementById("custom-destination-list");
    var entries = readStorage(CUSTOM_DESTINATIONS_KEY, []);
    list.textContent = "";
    if (!entries.length) {
      return;
    }
    var heading = document.createElement("h3");
    heading.textContent = "Destinations added in this browser";
    list.appendChild(heading);
    entries.forEach(function (entry) {
      var card = makeCard(entry.name + " · " + entry.location, entry.description + " Food: " + entry.foodName + ". " + entry.foodDescription);
      var photos = document.createElement("div");
      photos.className = "admin-destination-photos";
      [
        { source: entry.placeImage, description: entry.name + " photo" },
        { source: entry.foodImage, description: entry.foodName + " photo" }
      ].forEach(function (photo) {
        var image = document.createElement("img");
        image.src = photo.source;
        image.alt = photo.description;
        photos.appendChild(image);
      });
      card.appendChild(photos);
      var remove = document.createElement("button");
      remove.className = "button button-secondary";
      remove.type = "button";
      remove.textContent = "Remove destination";
      remove.addEventListener("click", function () {
        var remaining = readStorage(CUSTOM_DESTINATIONS_KEY, []).filter(function (savedEntry) {
          return savedEntry.id !== entry.id;
        });
        localStorage.setItem(CUSTOM_DESTINATIONS_KEY, JSON.stringify(remaining));
        renderCustomDestinations();
      });
      card.appendChild(remove);
      list.appendChild(card);
    });
  }

  function initializeCustomDestinations() {
    var form = document.getElementById("new-destination-form");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      setNewDestinationStatus("Reading photos and saving destination...", false);
      try {
        var placeImage = await readImageFile(
          document.getElementById("new-destination-image").files[0],
          "place"
        );
        var foodImage = await readImageFile(
          document.getElementById("new-food-image").files[0],
          "food"
        );
        var entry = {
          id: "destination-" + Date.now() + "-" + Math.random().toString(36).slice(2),
          name: document.getElementById("new-destination-name").value.trim(),
          location: document.getElementById("new-destination-location").value.trim(),
          description: document.getElementById("new-destination-description").value.trim(),
          placeImage: placeImage,
          foodName: document.getElementById("new-food-name").value.trim(),
          foodDescription: document.getElementById("new-food-description").value.trim(),
          foodImage: foodImage
        };
        if (!entry.name || !entry.location || !entry.description ||
            !entry.foodName || !entry.foodDescription) {
          throw new Error("Please complete all destination and food details.");
        }
        var entries = readStorage(CUSTOM_DESTINATIONS_KEY, []);
        entries.unshift(entry);
        localStorage.setItem(CUSTOM_DESTINATIONS_KEY, JSON.stringify(entries));
        form.reset();
        renderCustomDestinations();
        setNewDestinationStatus("Destination added. Open or refresh the homepage to see it. It is saved only in this browser.", false);
      } catch (error) {
        setNewDestinationStatus(error.message || "The destination could not be saved. Browser storage may be full.", true);
        console.error("Unable to add local destination:", error);
      } finally {
        submitButton.disabled = false;
      }
    });
    renderCustomDestinations();
  }

  function renderDestinationEditor() {
    var form = document.getElementById("destination-editor");
    Object.keys(destinations).forEach(function (id) {
      var group = document.createElement("fieldset");
      group.className = "admin-destination";
      var legend = document.createElement("legend");
      legend.textContent = destinations[id].name;
      group.appendChild(legend);
      ["name", "description", "food"].forEach(function (field) {
        var wrapper = document.createElement("div");
        wrapper.className = "form-row";
        var label = document.createElement("label");
        var input = field === "description" ? document.createElement("textarea") : document.createElement("input");
        var inputId = id + "-" + field;
        label.htmlFor = inputId;
        label.textContent = field === "food" ? "Famous food" : field.charAt(0).toUpperCase() + field.slice(1);
        input.id = inputId;
        input.name = inputId;
        input.maxLength = field === "description" ? 300 : 100;
        input.required = true;
        input.value = destinations[id][field];
        wrapper.appendChild(label);
        wrapper.appendChild(input);
        group.appendChild(wrapper);
      });
      form.appendChild(group);
    });
    var save = document.createElement("button");
    save.className = "button";
    save.type = "submit";
    save.textContent = "Save destination edits";
    form.appendChild(save);
    var reset = document.createElement("button");
    reset.className = "button button-secondary";
    reset.type = "button";
    reset.textContent = "Restore original details";
    reset.addEventListener("click", function () {
      localStorage.removeItem(DESTINATIONS_KEY);
      destinations = JSON.parse(JSON.stringify(DESTINATION_DEFAULTS));
      form.textContent = "";
      renderDestinationEditor();
      document.getElementById("destination-status").textContent = "Original destination details restored in this browser.";
    });
    form.appendChild(reset);

    form.onsubmit = function (event) {
      event.preventDefault();
      var updated = {};
      Object.keys(destinations).forEach(function (id) {
        updated[id] = {
          name: document.getElementById(id + "-name").value.trim(),
          description: document.getElementById(id + "-description").value.trim(),
          food: document.getElementById(id + "-food").value.trim()
        };
      });
      if (Object.keys(updated).some(function (id) {
        return !updated[id].name || !updated[id].description || !updated[id].food;
      })) {
        document.getElementById("destination-status").textContent = "Please fill in all destination fields.";
        return;
      }
      localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(updated));
      document.getElementById("destination-status").textContent = "Destination edits saved in this browser. Refresh the homepage to view them.";
    };
  }

  function buildRecordId(item) {
    if (item && item.id) {
      return item.id;
    }
    var seed = [item && item.name, item && item.topic, item && item.message, item && item.createdAt]
      .filter(function (value) { return typeof value === "string" && value.trim(); })
      .join("|");
    return "record-" + seed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function renderFeedback() {
    var target = document.getElementById("admin-feedback");
    var commentRecords = readStorage("phTravelogueComments", []);
    var contactRecords = readStorage("phTravelogueContactNotes", []);
    var records = [];
    commentRecords.forEach(function (item) {
      records.push({ title: item.name || "Visitor comment", body: item.message || "", type: "Suggestion / comment", date: item.createdAt, id: buildRecordId(item), deletable: true, storageKey: "phTravelogueComments" });
    });
    contactRecords.forEach(function (item) {
      records.push({ title: item.name || "Visitor message", body: (item.topic ? item.topic + ": " : "") + (item.message || ""), type: "Contact message", date: item.createdAt, id: buildRecordId(item), deletable: true, storageKey: "phTravelogueContactNotes" });
    });
    records.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    if (!records.length) {
      target.appendChild(makeCard("No cached messages yet", "Open the website and load its comments/contact notes in this browser, then return here."));
      return;
    }
    records.forEach(function (item) {
      var card = makeCard(item.title + " · " + item.type, item.body);
      if (item.deletable) {
        var remove = document.createElement("button");
        remove.className = "button button-secondary";
        remove.type = "button";
        remove.textContent = item.type === "Contact message" ? "Delete message" : "Delete comment";
        remove.addEventListener("click", function () {
          if (!window.confirm("Delete this " + (item.type === "Contact message" ? "message" : "comment") +
              " from this browser? This cannot be undone.")) {
            return;
          }
          var remaining = readStorage(item.storageKey, []).filter(function (record) {
            return buildRecordId(record) !== item.id;
          });
          localStorage.setItem(item.storageKey, JSON.stringify(remaining));
          target.textContent = "";
          renderFeedback();
          var status = document.getElementById("admin-feedback-status");
          status.textContent = item.type === "Contact message"
            ? "The visitor message was deleted from this browser."
            : "The comment was deleted from this browser.";
          status.className = "form-message review-success";
          status.style.display = "block";
        });
        card.appendChild(remove);
      }
      if (item.date) {
        var date = document.createElement("time");
        date.textContent = new Date(item.date).toLocaleString();
        card.appendChild(date);
      }
      target.appendChild(card);
    });
  }

  function renderRatings() {
    var target = document.getElementById("admin-ratings");
    var reviews = readStorage("phTravelogueReviews", []);
    var baseRatings = { banaue: 5, intramuros: 4.5, boracay: 5, bohol: 5, siargao: 5, samal: 4.5 };
    Object.keys(destinations).forEach(function (id) {
      var matching = reviews.filter(function (review) {
        return review.destinationId === id && Number(review.rating) >= 1 && Number(review.rating) <= 5;
      });
      var average = matching.length
        ? matching.reduce(function (total, review) { return total + Number(review.rating); }, 0) / matching.length
        : baseRatings[id];
      var heading = destinations[id].name + " — " + average.toFixed(1) + "/5";
      var detail = matching.length ? matching.length + (matching.length === 1 ? " cached review" : " cached reviews") : "Brochure rating (no cached reviews)";
      var card = makeCard(heading, detail);
      matching.forEach(function (review) {
        var note = document.createElement("p");
        note.textContent = "★".repeat(Number(review.rating)) + " — " + (review.name || "Visitor") + ": " + (review.review || "");
        card.appendChild(note);
      });
      target.appendChild(card);
    });
  }

  renderDestinationEditor();
  renderFeedback();
  renderRatings();
  window.addEventListener("storage", function (event) {
    if (event.key === "phTravelogueComments" || event.key === "phTravelogueContactNotes") {
      var target = document.getElementById("admin-feedback");
      target.textContent = "";
      renderFeedback();
    }
  });
  });
})();
