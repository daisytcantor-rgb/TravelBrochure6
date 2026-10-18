(function () {
  var toggle = document.getElementById("chatbot-toggle");
  var panel = document.getElementById("chatbot-panel");
  var form = document.getElementById("chatbot-form");
  var input = document.getElementById("chatbot-input");
  var messages = document.getElementById("chatbot-messages");
  if (!form || !input || !messages) {
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
      return "The site is organized into sections: Home for the landing page, About Us for the project story, Travel Guides for destination info, Gallery for pictures, Contact for messages, FAQ for common questions, and Login for demo accounts and admin access.";
    }

    if (text.indexOf("palawan") !== -1 || text.indexOf("el nido") !== -1 || text.indexOf("coron") !== -1) {
      return "Palawan is known for limestone cliffs, turquoise lagoons, island hopping, and beaches in El Nido and Coron. It is one of the most popular island destinations in the Philippines.";
    } else if (text.indexOf("boracay") !== -1) {
      return "Boracay in Aklan is famous for White Beach, sunset views, water activities, and a lively island atmosphere.";
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

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      if (!isOpen) {
        input.focus();
      }
    });
  }

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
})();
